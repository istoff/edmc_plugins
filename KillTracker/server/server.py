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


# Update the powerplay_session structure near the top of server.py
powerplay_session = {
    'power': None,
    'total_merits': 0,
    'session_merits': 0,
    'merit_sources': {
        'Trading': 0,
        'Bounty Hunting': 0,
        'Ground Combat': 0,
        'Fortification': 0,
        'Other': 0
    },
    'last_updated': None
}


def process_powerplay_merits_event(entry, data):
    """Process PowerplayMerits events, update session data, and format for the client"""
    global powerplay_session
    
    power = entry.get('Power', 'Unknown Power')
    merits_gained = entry.get('MeritsGained', 0)
    total_merits = entry.get('TotalMerits', 0)
    
    # Get merit source from the entry if available, otherwise use 'Other'
    merit_source = entry.get('meritSource', 'Other')
    
    # Update session data - preserving other merit sources
    if powerplay_session['power'] != power:
        # Reset session if power changed
        powerplay_session['session_merits'] = merits_gained
        powerplay_session['merit_sources'] = {
            'Trading': 0,
            'Bounty Hunting': 0,
            'Ground Combat': 0,
            'Fortification': 0,
            'Other': 0
        }
        powerplay_session['merit_sources'][merit_source] = merits_gained
    else:
        # Add to existing session
        powerplay_session['session_merits'] += merits_gained
        
        # Update merit source count - initialize if not exists
        if merit_source not in powerplay_session['merit_sources']:
            powerplay_session['merit_sources'][merit_source] = 0
        
        # Add new merits to the appropriate source
        powerplay_session['merit_sources'][merit_source] += merits_gained
    
    powerplay_session['power'] = power
    powerplay_session['total_merits'] = total_merits
    
    # If client sent all merit sources, use those instead
    # BUT ONLY IF it's a proper dictionary with expected sources
    if 'meritSources' in entry and isinstance(entry['meritSources'], dict):
        # Verify it contains at least some of our expected keys
        expected_keys = ['Trading', 'Bounty Hunting', 'Ground Combat', 'Fortification', 'Other']
        has_expected_keys = any(key in entry['meritSources'] for key in expected_keys)
        
        if has_expected_keys:
            powerplay_session['merit_sources'] = entry['meritSources']
    elif 'meritSources' in data and isinstance(data['meritSources'], dict):
        # Try to get merit sources from the data object if not in entry
        expected_keys = ['Trading', 'Bounty Hunting', 'Ground Combat', 'Fortification', 'Other']
        has_expected_keys = any(key in data['meritSources'] for key in expected_keys)
        
        if has_expected_keys:
            powerplay_session['merit_sources'] = data['meritSources']
    
    # Save updated session
    save_powerplay_session()
    
    # Calculate percentages for visualization
    total_session_merits = powerplay_session['session_merits'] if powerplay_session['session_merits'] > 0 else 1
    merit_percentages = {
        source: (count / total_session_merits) * 100 
        for source, count in powerplay_session['merit_sources'].items()
    }
    
    processed_data = {
        'timestamp': entry.get('timestamp', ''),
        'event': 'PowerplayMerits',
        'eventType': 'PowerplayMerits',
        'Power': power,
        'power': power,
        'MeritsGained': merits_gained,
        'TotalMerits': total_merits,
        'meritsGained': merits_gained,  # Duplicate with lowercase for client consistency
        'totalMerits': total_merits,    # Duplicate with lowercase for client consistency
        'bountyAmount': merits_gained,  # Using merits gained as bounty amount for display
        'Ship': 'None',
        'shipname': 'None',
        'VictimFaction': power,  # Using Power as VictimFaction for display
        'AwardingFaction': power,  # Using Power as AwardingFaction for display
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', ''),
        'sessionMerits': powerplay_session['session_merits'],
        'meritSource': merit_source,  # Add merit source
        'meritSources': powerplay_session['merit_sources'],  # Add all merit sources for the session
        'meritPercentages': merit_percentages  # Add percentages for visualization
    }
    
    return processed_data

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
                
                # Initialize merit_sources if it doesn't exist
                if 'merit_sources' not in powerplay_session:
                    powerplay_session['merit_sources'] = {
                        'Trading': 0,
                        'Bounty Hunting': 0,
                        'Ground Combat': 0,
                        'Fortification': 0,
                        'Other': 0
                    }
                
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

def to_title_case(name):
    """Convert string to title case (e.g. 'anaconda' -> 'Anaconda')"""
    if not name or name == 'Unknown':
        return name
    return name.title()

def normalize_ship_name(ship_name, raw_name=None):
    """Convert ship name to standardized format matching image filenames"""
    # First try to use localized name if available
    if ship_name and ship_name != 'Unknown':
        # Convert to lowercase and remove special characters
        normalized = ship_name.lower().replace(' ', '-').replace('_', '-')
        normalized = ''.join(c for c in normalized if c.isalnum() or c == '-')
        
        # Remove any remaining special cases
        normalized = normalized.replace('type-', 'type').replace('mk-', 'mk')
        return normalized
    
    # Fall back to raw name if no localized name
    if raw_name:
        return raw_name.lower().replace(' ', '-').replace('_', '-')
    
    return 'unknown-ship'

def process_bounty_event(entry, data):
    """Process Bounty events and format for the client"""
    # Get display name - prefer localized, fall back to raw
    display_name = entry.get('Target_Localised', 
                           entry.get('Ship_Localised',
                           entry.get('Target',
                           entry.get('Ship', 'Unknown'))))
    
    # Get raw name for normalization
    raw_name = entry.get('Target', entry.get('Ship', ''))
    normalized_name = normalize_ship_name(display_name, raw_name)
    
    # Apply title case to display names for better readability
    display_name = to_title_case(display_name)
    
    processed_data = {
        'timestamp': entry.get('timestamp', ''),
        'event': 'Bounty',
        'eventType': 'Bounty',
        'shipname': display_name,
        'Ship': display_name,
        'shipImageFileName': normalized_name,
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

# Improved ShipLocker event processing for PowerPlay commodities

def process_ship_locker_event(entry, data):
    """Process ShipLocker events and extract relevant commodities for powerplay"""
    powerplay_commodities = []
    
    # Define powerplay keyword patterns for better detection
    powerplay_patterns = [
        # Power prefixed items - direct indicators of PowerPlay commodities
        "power", 
        
        # General PowerPlay keywords that appear in commodity names
        "propaganda", "aid", "supply", "supplies", "prisoner", "prisoners",
        "report", "reports", "slaves", "political", "intelligence", 
        "countermeasure", "garrison", "material", "protocol", "package",
        "order", "marked", "corruption", "evidence", "dissent", "vote",
        
        # Faction specific items
        "hudson", "winters", "mahon", "patreus", "torval", "duval", 
        "delaine", "yong-rui", "antal", "grom"
    ]
    
    # Sections to check for PowerPlay commodities
    sections = ['Items', 'Components', 'Consumables', 'Data']
    
    # Check each section of the ShipLocker
    for section in sections:
        if section in entry and isinstance(entry[section], list):
            items = entry[section]
            
            for item in items:
                if not isinstance(item, dict):
                    continue
                    
                # Get item details
                name = item.get('Name', '').lower()
                name_localized = item.get('Name_Localised', '').lower()
                count = item.get('Count', 0)
                
                # Special handling for known PowerPlay prefixes
                if name.startswith('power'):
                    # This is almost certainly a PowerPlay commodity
                    powerplay_commodities.append({
                        'name': item.get('Name_Localised', item.get('Name', '')),
                        'count': count
                    })
                    continue
                
                # Check for other powerplay patterns
                is_powerplay_item = False
                for pattern in powerplay_patterns:
                    if pattern in name or pattern in name_localized:
                        is_powerplay_item = True
                        break
                
                if is_powerplay_item:
                    powerplay_commodities.append({
                        'name': item.get('Name_Localised', item.get('Name', '')),
                        'count': count
                    })
    
    # Log the found commodities
    if powerplay_commodities:
        print(f"Found {len(powerplay_commodities)} PowerPlay commodities in ShipLocker:")
        for commodity in powerplay_commodities:
            print(f"  - {commodity['name']}: {commodity['count']}")
    
    # Return the processed event data
    return {
        'timestamp': entry.get('timestamp', ''),
        'event': 'ShipLocker',
        'eventType': 'ShipLocker',
        'powerplayCommodities': powerplay_commodities,
        'system': data.get('system', ''),
        'station': data.get('station', ''),
        'cmdr': data.get('cmdr', '')
    }


@app.route('/')
def home():
    return render_template('table.html')

@app.route('/new_kill', methods=['POST'])
def update_kills():
    try:
        data = request.json
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
            # Emit with the correct event type
            socketio.emit('powerplay_commodities', processed_data)
            print(f"Emitted powerplay_commodities with {len(processed_data.get('powerplayCommodities', []))} items")
        
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
