import os
import socket
import requests
import json
import logging
from typing import Tuple, Optional, Dict, Any, List
import tkinter as tk
from tkinter.ttk import Notebook
import myNotebook as nb
from config import config
from config import appname
import plug
from collections import deque

PLUGIN_NAME = "KillsTracker"
PLUGIN_VERSION = "0.7"

# Supported event types
SUPPORTED_EVENTS = [
    'Bounty',
    'FactionKillBond',
    'ShipTargeted',
    'PowerplayMerits',
    'ShipLocker',
    'MarketBuy',
    'MarketSell',
    'CargoDepot',
    'CargoTransfer',
    'Cargo',
    'SellOrganicData',
]

# Event history buffer for context analysis
EVENT_HISTORY_SIZE = 10
event_history = deque(maxlen=EVENT_HISTORY_SIZE)

# Setup logger
plugin_name = os.path.basename(os.path.dirname(__file__))
logger = logging.getLogger(f'{appname}.{plugin_name}')

# Initialize logger if needed
if not logger.hasHandlers():
    level = logging.DEBUG
    logger.setLevel(level)
    logger_channel = logging.StreamHandler()
    logger_formatter = logging.Formatter(f'%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d:%(funcName)s: %(message)s')
    logger_formatter.default_time_format = '%Y-%m-%d %H:%M:%S'
    logger_formatter.default_msec_format = '%s.%03d'
    logger_channel.setFormatter(logger_formatter)
    logger.addHandler(logger_channel)

# Load configuration values with defaults
ip_var = config.get_str("KillsTracker_IP") or "127.0.0.1"
port_var = config.get_int("KillsTracker_PORT") or 5050
logging_var = config.get_int("KillsTracker_LOG") or False
localhost_var = config.get_int("KillsTracker_LOCALHOST") or True
speech_var = config.get_int("KillsTracker_SPEECH") or False

# Construct the server URL
server_url = config.get_str("KillsTracker_URL") or f"http://{ip_var}:{port_var}/new_kill"

# PowerPlay merit source tracking
merit_sources = {
    'Trading': 0,
    'Bounty Hunting': 0,
    'Ground Combat': 0,
    'Fortification': 0,
    'Other': 0
}

def plugin_start3(plugin_dir: str) -> Tuple[str, str, str]:
    """Called when the plugin is enabled."""
    if logging_var:
        logger.info("KillsTracker plugin started")
        logger.info(f"Server URL: {server_url}")
    
    return PLUGIN_NAME

def send_event_data(event_data):
    """Send event data to the server."""
    try:
        response = requests.post(server_url, json=event_data)
        response.raise_for_status()
        
        if logging_var:
            logger.info("Event data sent successfully")
    except requests.exceptions.RequestException as e:
        if logging_var:
            logger.error(f'Web call failed: {str(e)}')


def plugin_prefs(parent: nb.Notebook, cmdr: str, is_beta: bool) -> Optional[tk.Frame]:
    """Create the preferences UI."""
    frame = nb.Frame(parent)
    frame = create_new_prefs_ui(frame)
    return frame

def prefs_changed(cmdr: str, is_beta: bool) -> None:
    """Save settings when preferences are changed."""
    global ip_var, port_var, speech_var, localhost_var, logging_var, server_url
    
    try:
        # Update config with current UI values
        ip_var = ip_var_tk.get()
        port_var = port_var_tk.get()
        speech_var = speech_var_tk.get()
        localhost_var = localhost_var_tk.get()
        logging_var = logging_var_tk.get()
        
        # Update the server URL
        server_url = f"http://{ip_var}:{port_var}/new_kill"
        
        # Save all settings to config
        config.set("KillsTracker_IP", ip_var)
        config.set("KillsTracker_PORT", port_var)
        config.set("KillsTracker_SPEECH", speech_var)
        config.set("KillsTracker_LOCALHOST", localhost_var)
        config.set("KillsTracker_LOG", logging_var)
        config.set("KillsTracker_URL", server_url)
        config.save()
        
        if logging_var:
            logger.info("KillsTracker preferences saved")
            logger.info(f"Updated server URL: {server_url}")
            
    except Exception as e:
        logger.error(f"Error saving preferences: {e}")

def create_new_prefs_ui(frame):
    """Create the preferences user interface."""
    # Convert our configuration variables to TK variables
    ip_var_tk = tk.StringVar(value=config.get_str("KillsTracker_IP"))
    port_var_tk = tk.IntVar(value=config.get_int("KillsTracker_PORT") or 5050)
    logging_var_tk = tk.IntVar(value=config.get_int("KillsTracker_LOG") or False)
    localhost_var_tk = tk.IntVar(value=config.get_int("KillsTracker_LOCALHOST") or True)
    speech_var_tk = tk.IntVar(value=config.get_int("KillsTracker_SPEECH") or False)
    status_var = tk.StringVar(value="")
    
    # Settings section
    lblSettings = nb.Label(frame, justify="left", text="Plugin Settings")
    lblSettings.place(x=10, y=10, width=140, height=25)
    
    # Logging checkbox
    cbLogging = nb.Checkbutton(frame, variable=logging_var_tk, text="Enable Logging")
    cbLogging.place(x=10, y=30, width=140, height=25)
    
    # Server settings
    lblServerSetting = nb.Label(frame, text="Server Settings")
    lblServerSetting.place(x=10, y=90, width=140, height=25)
    
    # Speech checkbox
    cbSpeech = nb.Checkbutton(frame, variable=speech_var_tk, text="Enable Speech")
    cbSpeech.place(x=10, y=110, width=140, height=25)
    
    # Network settings
    lblNetworkSettings = nb.Label(frame, text="Network Settings")
    lblNetworkSettings.place(x=10, y=160, width=160, height=25)
    
    # Localhost checkbox
    cbLocalHost = nb.Checkbutton(frame, variable=localhost_var_tk, text="Use Localhost")
    cbLocalHost.place(x=10, y=190, width=140, height=25)
    
    # IP Address
    lblIPAddress = nb.Label(frame, text="Detected IP:")
    lblIPAddress.place(x=10, y=230, width=70, height=25)
    
    edtIPAddress = nb.Entry(frame, textvariable=ip_var_tk)
    edtIPAddress.place(x=90, y=230, width=92, height=30)
    
    # Port
    lblPort = nb.Label(frame, text="Server Port")
    lblPort.place(x=180, y=230, width=70, height=25)
    
    edtPort = nb.Entry(frame, textvariable=port_var_tk)
    edtPort.place(x=260, y=230, width=52, height=30)
    
    # Server address
    lblServer = nb.Label(frame, text=f"Server Address: http://{ip_var_tk.get()}:{port_var_tk.get()}")
    lblServer.place(x=360, y=230, width=270, height=25)
    
    # Buttons
    btnGetMyIP = nb.Button(frame, text="Get My IP")
    btnGetMyIP.place(x=120, y=280, width=100, height=25)
    
    btnTestServer = nb.Button(frame, text="Test Server")
    btnTestServer.place(x=10, y=280, width=100, height=25)
    
    # Status message
    lblMessage = nb.Label(frame, text="Status")
    lblMessage.place(x=10, y=310, width=600, height=25)
    
    # Button functions
    def cbTestServerClicked():
        try:
            parsed_host = ip_var_tk.get()
            parsed_port = port_var_tk.get()
            url = f"http://{parsed_host}:{parsed_port}"
            
            lblMessage.config(fg="black", text=f"Testing {url}")
            response = requests.get(url)
            
            if response.status_code == 200:
                lblMessage.config(fg="green", text="Connection successful!")
                return "Connection successful!"
            else:
                lblMessage.config(fg="red", text="Connection failed!")
                return "Connection failed!"
        except Exception as e:
            lblMessage.config(fg="red", text=f"Connection failed! {e}")
            return f"Connection failed! {e}"
    
    def get_current_ip():
        try:
            ip = socket.gethostbyname(socket.gethostname())
            ip_var_tk.set(ip)
            return ip
        except Exception as e:
            logger.error(f"Error getting IP: {e}")
            return "127.0.0.1"
    
    def cbLocalHostClicked():
        if localhost_var_tk.get():
            ip_var_tk.set('127.0.0.1')
            result = "Use Localhost"
        else:
            ip_var_tk.set(get_current_ip())
            result = "Use dedicated IP"
        
        lblServer.config(text=f"Server Address: http://{ip_var_tk.get()}:{port_var_tk.get()}")
        return result
    
    def cbSpeechClicked():
        target_url = f"http://{ip_var_tk.get()}:{port_var_tk.get()}"
        
        if speech_var_tk.get():
            result = "Speech Enabled"
            url = f"{target_url}/speech_enable"
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    result = "Speech Enabled!"
            except:
                pass
        else:
            result = "Speech Disabled"
            url = f"{target_url}/speech_disable"
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    result = "Speech Disabled!"
            except:
                pass
        
        return result
    
    def cbLoggingClicked():
        return "Logging Enabled" if logging_var_tk.get() else "Logging Disabled"
    
    def update_config():
        """Update config with current UI values"""
        config.set("KillsTracker_IP", ip_var_tk.get())
        config.set("KillsTracker_PORT", port_var_tk.get())
        config.set("KillsTracker_SPEECH", speech_var_tk.get())
        config.set("KillsTracker_LOCALHOST", localhost_var_tk.get())
        config.set("KillsTracker_LOG", logging_var_tk.get())
        config.set("KillsTracker_URL", f"http://{ip_var_tk.get()}:{port_var_tk.get()}/new_kill")
        config.save()

    # Button commands with config updates
    btnGetMyIP.configure(command=lambda: (
        ip_var_tk.set(get_current_ip()),
        lblServer.config(text=f"Server Address: http://{ip_var_tk.get()}:{port_var_tk.get()}"),
        update_config()
    ))
    
    btnTestServer.configure(command=lambda: (
        lblMessage.config(text=cbTestServerClicked()),
        update_config()
    ))
    
    cbSpeech.configure(command=lambda: (
        lblMessage.config(text=cbSpeechClicked()),
        update_config()
    ))
    
    cbLocalHost.configure(command=lambda: (
        lblMessage.config(text=cbLocalHostClicked()),
        update_config()
    ))
    
    cbLogging.configure(command=lambda: (
        lblMessage.config(text=cbLoggingClicked()),
        update_config()
    ))
    config.save()
    return frame

def test_http_post():
    """Send a test message to verify the server connection."""
    test_data = {'test': 'This is a test post from the EDMC plugin.'}
    send_event_data(test_data)

def reset_merit_sources():
    """Reset the merit sources tracking"""
    global merit_sources
    for key in merit_sources:
        merit_sources[key] = 0


def determine_powerplay_merit_source(entry: Dict[str, Any]) -> str:
    """
    Determine the source of PowerPlay merits by analyzing recent events
    
    Returns: 
        str: One of "Trading", "Bounty Hunting", "Ground Combat", "Fortification", "Other"
    """
    # Analyze event history to determine merit source
    if not event_history:
        return "Other"
    
    # Check recent events for clues about the merit source
    for past_event in list(event_history):
        event_type = past_event.get('event', '')
        
        # Bounty or combat events preceding PowerplayMerits -> Bounty Hunting
        if event_type in ['Bounty', 'ShipTargeted','FactionKillBond']:
            return "Bounty Hunting"
        
        # Trading events
        elif event_type in ['MarketBuy', 'MarketSell', 'CargoDepot']:
            return "Trading"
        
        # Ground combat related events
        elif event_type in ['SellOrganicData', 'FSSSignalDiscovered'] and 'War' in past_event.get('SignalName', ''):
            return "Ground Combat"
        
        # Fortification related events
        elif event_type in ['CargoTransfer', 'Cargo'] and 'garrison' in str(past_event).lower():
            return "Fortification"
    
    # Default if no specific source identified
    return "Other"

def update_merit_sources(source: str, amount: int):
    """Update the merit sources tracking dictionary"""
    global merit_sources
    if source in merit_sources:
        merit_sources[source] += amount
    else:
        merit_sources["Other"] += amount


def journal_entry(cmdr, is_beta, system, station, entry, state):
    """Process journal entries and send relevant ones to the server with improved PowerPlay tracking."""
    global event_history
    global merit_source
    global merit_sources
    
    # Add to event history for context analysis
    event_history.append(entry)
    
    event = entry.get('event')
    
    if event not in SUPPORTED_EVENTS:
        return
    
    if logging_var:
        logger.info(f'Detected event: {event}')
        logger.info(entry)
    
    # For ShipTargeted events, only send if the target is locked
    if event == 'ShipTargeted' and not entry.get('TargetLocked', False):
        if logging_var:
            logger.info("Ship Targeted event not sent, TargetLocked is False")
        return
    
    # Create a basic data packet with the raw event data
    event_data = {
        'event': event,
        'timestamp': entry.get('timestamp', ''),
        'system': system,
        'station': station,
        'cmdr': cmdr,
        'entry': entry  # Send the raw event data for server-side processing
    }
    
    # Special processing for PowerplayMerits events
    if event == 'PowerplayMerits':
        merits_gained = entry.get('MeritsGained', 0)
        
        # Determine the source of the merits
        merit_source = determine_powerplay_merit_source(entry)
        
        # Update local tracking
        update_merit_sources(merit_source, merits_gained)
        
        # Add merit source information to the event data
        event_data['meritSource'] = merit_source
        event_data['meritSources'] = merit_sources
        
        if logging_var:
            logger.info(f"PowerplayMerits event: {merits_gained} merits from {merit_source}")
    
    # Special processing for ShipLocker events
    elif event == 'ShipLocker':
        # Extract PowerPlay commodities from ship locker with improved detection
        powerplay_commodities = extract_powerplay_commodities(entry)
        if powerplay_commodities:
            event_data['powerplayCommodities'] = powerplay_commodities
            if logging_var:
                logger.info(f"Found {len(powerplay_commodities)} PowerPlay commodities in ship locker")
    
    # Send to server
    send_event_data(event_data)


def extract_powerplay_commodities(entry: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract PowerPlay commodities from ShipLocker event with improved detection"""
    commodities = []
    
    # Check relevant sections of the ship locker
    sections = ['Items', 'Components', 'Consumables', 'Data', 'Inventory']
    
    for section in sections:
        if section in entry:
            # Ensure we're working with a list
            if not isinstance(entry[section], list):
                continue
                
            for item in entry[section]:
                if not isinstance(item, dict) or 'Name' not in item:
                    continue
                    
                name = item.get('Name', '').lower()
                name_localized = item.get('Name_Localised', '').lower()
                count = item.get('Count', 0)
                
                # Expanded list of PowerPlay keywords for better detection
                is_powerplay_item = False
                powerplay_keywords = [
                    'propaganda', 'aid', 'supply', 'supplies', 'prisoner', 'prisoners',
                    'report', 'reports', 'slaves', 'political', 'intelligence', 
                    'countermeasure', 'garrison', 'material', 'protocol', 'package',
                    'order', 'marked', 'evidence', 'dissent', 'pamphlet', 'bulletin',
                    'certificate', 'treaty', 'document', 'ethos', 'survey', 'ballot',
                    'vote', 'corruption'
                ]
                
                # Check both the base name and localized name
                for keyword in powerplay_keywords:
                    if keyword in name or keyword in name_localized:
                        is_powerplay_item = True
                        break
                
                if is_powerplay_item:
                    commodities.append({
                        'name': item.get('Name_Localised', item.get('Name', '')),
                        'count': count
                    })
    
    return commodities
