from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import json
import os
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
# Fix for threading issues - don't use eventlet
socketio = SocketIO(app, async_mode='threading')
localhost = False  # Set to False to use external IP

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('killtracker_server')

# Session data for PowerPlay
powerplay_session = {
    'power': None,
    'total_merits': 0,
    'session_merits': 0,
    'last_updated': None,
    'activities': {
        'cargo_sold': {},  # {commodity: {'tons': x, 'merits': y}}
        'space_combat': 0,
        'ground_combat': 0, 
        'ship_scanned': 0,
        'other': 0
    }
}

# Path to session storage file
session_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../powerplay_session.json')

def load_powerplay_session():
    """Load PowerPlay session data from file if available"""
    global powerplay_session
    
    if os.path.exists(session_file):
        try:
            with open(session_file, 'r') as f:
                data = json.load(f)
                powerplay_session = data
                logger.info(f"Loaded PowerPlay session: {powerplay_session['power']}, "
                           f"{powerplay_session['total_merits']} total merits")
        except Exception as e:
            logger.error(f"Error loading PowerPlay session: {e}")

def save_powerplay_session():
    """Save PowerPlay session data to file"""
    try:
        # Update timestamp
        powerplay_session['last_updated'] = datetime.now().isoformat()
        
        with open(session_file, 'w') as f:
            json.dump(powerplay_session, f)
            
        logger.info(f"Saved PowerPlay session: {powerplay_session['power']}, "
                   f"{powerplay_session['total_merits']} total merits, "
                   f"{powerplay_session['session_merits']} session merits")
    except Exception as e:
        logger.error(f"Error saving PowerPlay session: {e}")

def process_bounty_event(entry, data):
    """Process Bounty events and format for the client"""
    processed_data = {
        'timestamp': entry.get('timestamp', ''),
        'event': 'Bounty',
        'eventType': 'Bounty',
        'shipname': entry.get('Target_Localised', entry.get('Ship_Localised', 'Unknown')),
        'Ship': entry.get('Target_Localised', entry.get('Ship_Localised', 'Unknown')),
        'shipImageFileName': entry.get('Target', '').replace('-', '').replace(' ', '-'),
        'bountyAmount': entry.get('TotalReward', 0),
        'VictimFaction': entry.get('VictimFaction', 'Unknown'),
        'Faction': entry.get('VictimFaction', 'Unknown'),
        'Rewards': entry.get('Rewards', []),
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', '')
    }
    return processed_data

def process_faction_kill_bond_event(entry, data):
    """Process FactionKillBond events and format for the client"""
    processed_data = {
        'timestamp': entry.get('timestamp', ''),
        'event': 'FactionKillBond',
        'eventType': 'FactionKillBond',
        'shipname': '',
        'shipType': '',
        'shipImageFileName': '',
        'bountyAmount': entry.get('Reward', 0),
        'VictimFaction': entry.get('VictimFaction', 'Unknown'),
        'AwardingFaction': entry.get('AwardingFaction', 'Unknown'),
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', '')
    }
    return processed_data

def process_ship_targeted_event(entry, data):
    """Process ShipTargeted events and format for the client"""
    # Only process if the target is locked and has a bounty
    if not entry.get('TargetLocked', False):
        return None
        
    bounty = entry.get('Bounty', 0)
    
    # Skip low value targets
    if bounty < 500000:
        return None
        
    processed_data = {
        'timestamp': entry.get('timestamp', ''),
        'event': 'ShipTargeted',
        'eventType': 'ShipTargeted',
        'Ship': entry.get('Ship', entry.get('Target', 'Unknown')),
        'shipname': entry.get('Ship_Localised', entry.get('Target_Localised', 'Unknown')),
        'shipImageFileName': '',
        'bountyAmount': bounty,
        'VictimFaction': f"{entry.get('PilotName_Localised', entry.get('PilotName', ''))}:" +
                         f" ({entry.get('PilotRank', '')})",
        'Faction': entry.get('Faction', 'Unknown'),
        'PilotName': entry.get('PilotName_Localised', entry.get('PilotName', '')),
        'LegalStatus': entry.get('LegalStatus', ''),
        'PilotRank': entry.get('PilotRank', ''),
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', '')
    }
    return processed_data

def process_ship_locker_event(entry, data):
    """Process ShipLocker events and extract relevant commodities for powerplay"""
    relevant_items = {
        'Items': [],
        'Components': [],
        'Consumables': [],
        'Data': []
    }
    
    # Define which commodities we care about for powerplay (sorted by merit value descending)
    powerplay_items = {
        'Data': [
            # Special Intelligence Items (15-25 merits)
            'protectedresearchprotocol',
            'sensitivefinancialrecord', 
            'confidentialcorrespondence',
            'strategicprojectiondata',
            'tacticalintelligence',
            
            # Power Data Types (10-15 merits)
            'powerintelligencedata',
            'powerstrategicdata',
            'powereconomicdata',
            'powersecuritydata',
            'powermilitarydata',
            'powerindustrialdata',
            'powerresearchdata',
            'powerpoliticaldata',
            'powerassociationdata',
            
            # Technology/Research (8-15 merits)
            'advancedresearchmaterial',
            'prototypetechnology',
            'scientificbreakthrough',
            'researchdatafragment',
            'technicalspecification',
            
            # Resource Samples (5-12 merits)
            'advancedresourceextract',
            'syntheticmaterial',
            'industrialcomposite',
            'rareelementsample',
            'mineralsample',
            
            # Biological/Agricultural (5-12 merits)
            'enhancedagriculturalelements',
            'geneticallymodifiedcrops',
            'cultivatedspecimens',
            'biologicalresidue',
            'agriculturalsample'
        ],
        'Items': ['weaponschematic', 'buildingschematic'],
        'Components': ['encryptedmemorychip', 'scrambler'],
        'Consumables': ['amm_grenade_emp', 'amm_grenade_shield', 'bypass']
    }
    
    # Filter the event data for relevant commodities
    for category in ['Items', 'Components', 'Consumables', 'Data']:
        if category in entry:
            for item in entry[category]:
                if item['Name'] in powerplay_items[category]:
                    relevant_items[category].append({
                        'Name': item.get('Name_Localised', item['Name']),
                        'Count': item['Count']
                    })
    
    return {
        'timestamp': entry.get('timestamp', ''),
        'event': 'ShipLocker',
        'eventType': 'ShipLocker',
        'Items': relevant_items['Items'],
        'Components': relevant_items['Components'],
        'Consumables': relevant_items['Consumables'],
        'Data': relevant_items['Data'],
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', '')
    }

def process_powerplay_merits_event(entry, data):
    """Process PowerplayMerits events, update session data, and format for the client"""
    global powerplay_session
    
    power = entry.get('Power', 'Unknown Power')
    merits_gained = entry.get('MeritsGained', 0)
    total_merits = entry.get('TotalMerits', 0)
    
    # Default activity type and commodity data
    activity_type = entry.get('activity_type', data.get('activity_type', 'other'))
    commodity = entry.get('commodity', data.get('commodity'))
    tons = entry.get('tons', data.get('tons', 0))
    
    # Initialize activities if not present
    if 'activities' not in powerplay_session:
        powerplay_session['activities'] = {
            'cargo_sold': {},
            'space_combat': 0,
            'ground_combat': 0,
            'ship_scanned': 0,
            'other': 0
        }
    
    # Update session data
    if powerplay_session['power'] != power:
        # Reset session if power changed
        powerplay_session['session_merits'] = merits_gained
        powerplay_session['activities'] = {
            'cargo_sold': {},
            'space_combat': 0,
            'ground_combat': 0,
            'ship_scanned': 0,
            'other': 0
        }
    else:
        # Add to existing session
        powerplay_session['session_merits'] += merits_gained
    
    # Track merits by activity type
    try:
        if activity_type == 'cargo_sold' and commodity:
            if commodity not in powerplay_session['activities']['cargo_sold']:
                powerplay_session['activities']['cargo_sold'][commodity] = {
                    'tons': 0,
                    'merits': 0
                }
            powerplay_session['activities']['cargo_sold'][commodity]['tons'] += tons
            powerplay_session['activities']['cargo_sold'][commodity]['merits'] += merits_gained
        elif activity_type in powerplay_session['activities']:
            powerplay_session['activities'][activity_type] += merits_gained
        else:
            powerplay_session['activities']['other'] += merits_gained
    except KeyError as e:
        logger.error(f"Error tracking activity type {activity_type}: {e}")
        powerplay_session['activities']['other'] += merits_gained
    
    powerplay_session['power'] = power
    powerplay_session['total_merits'] = total_merits
    
    # Save updated session
    save_powerplay_session()
    
    processed_data = {
        'timestamp': entry.get('timestamp', ''),
        'event': 'PowerplayMerits',
        'eventType': 'PowerplayMerits',
        'Power': power,
        'power': power,
        'MeritsGained': merits_gained,
        'TotalMerits': total_merits,
        'meritsGained': merits_gained,
        'totalMerits': total_merits,
        'bountyAmount': merits_gained,
        'Ship': 'None',
        'shipname': 'None',
        'VictimFaction': power,
        'AwardingFaction': power,
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', ''),
        'sessionMerits': powerplay_session['session_merits'],
        'activityType': activity_type,
        'commodity': commodity,
        'tons': tons,
        'activities': powerplay_session['activities']
    }
    return processed_data

@app.route('/')
def home():
    return render_template('table.html')

@app.route('/new_kill', methods=['POST'])
def update_kills():
    try:
        data = request.json
        logger.info(f"Received event: {data.get('event', 'Unknown')}")
        # write to console
        print(f"Received event: {data.get('event', 'Unknown')}")
        


        # Extract the raw entry data
        entry = data.get('entry', {})
        event_type = entry.get('event', '')
        
        # Empty response for unsupported event types
        processed_data = None
        
        # Process based on event type
        if event_type == 'Bounty':
            processed_data = process_bounty_event(entry, data)
            socketio.emit('new_kill', processed_data)
            
        elif event_type == 'FactionKillBond':
            processed_data = process_faction_kill_bond_event(entry, data)
            socketio.emit('new_kill', processed_data)
            
        elif event_type == 'ShipTargeted':
            processed_data = process_ship_targeted_event(entry, data)
            if processed_data:
                socketio.emit('new_kill', processed_data)
            
        elif event_type == 'PowerplayMerits':
            processed_data = process_powerplay_merits_event(entry, data)
            socketio.emit('powerplay_merits', processed_data)
            
        elif event_type == 'ShipLocker':
            processed_data = process_ship_locker_event(entry, data)
            socketio.emit('powerplay_commodities', processed_data)
        
        # Test event
        elif event_type == 'test':
            socketio.emit('new_test', data)
            return jsonify({'success': True, 'data': data})
            
        # Return a response based on whether the event was processed
        if processed_data:
            return jsonify({'success': True, 'data': processed_data})
        else:
            return jsonify({'success': False, 'message': f'Unsupported event type: {event_type}'})
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/powerplay_merits', methods=['POST'])
def update_powerplay():
    try:
        data = request.json
        logger.info(f"Received PowerplayMerits: {data}")
        
        # We're now handling all events through the main endpoint,
        # but keep this endpoint for backward compatibility
        entry = data.get('entry', data)  # Use data as entry if no entry field
        processed_data = process_powerplay_merits_event(entry, data)
        
        socketio.emit('powerplay_merits', processed_data)
        return jsonify({'success': True, 'data': processed_data})
    except Exception as e:
        logger.error(f"Error processing PowerplayMerits: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/speech_enable', methods=['GET'])
def speech_enable():    
    socketio.emit('speech_enable')
    return jsonify({'success': True})

@app.route('/speech_disable', methods=['GET'])
def speech_disable():    
    socketio.emit('speech_disable')
    return jsonify({'success': True})

@app.route('/test_server', methods=['GET'])
def test_server():    
    socketio.emit('test_server')
    return jsonify({'success': True})

if __name__ == '__main__':
    # Load existing PowerPlay session data if available
    load_powerplay_session()
    
    host = '127.0.0.1' if localhost else '0.0.0.0'
    port = 5050
    
    logger.info(f"Starting server on {host}:{port}")
    socketio.run(app, host=host, port=port, debug=True)
