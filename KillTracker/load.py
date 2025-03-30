import os
import socket
import requests
import json
import logging
from theme import theme
from typing import Tuple
from typing import Optional
import tkinter as tk
from tkinter.ttk import Notebook
import myNotebook as nb
from config import config
from config import appname
import plug
from urllib.parse import urlparse
import tkinter.font as tkFont

PLUGIN_NAME = "KillsTracker"

PLUGIN_VERSION = "0.5"
#TARGET_URL = "http://10.0.0.90"
#TARGET_PORT = "5050"
TARGET_PATH = "new_kill"
#TARGET_URL = "http://10.0.0.90:5050/new_kill"

## Setup Official Logger Code
# This could also be returned from plugin_start3()
plugin_name = os.path.basename(os.path.dirname(__file__))

# A Logger is used per 'found' plugin to make it easy to include the plugin's
# folder name in the logging output format.
# NB: plugin_name here *must* be the plugin's folder name as per the preceding
#     code, else the logger won't be properly set up.
logger = logging.getLogger(f'{appname}.{plugin_name}')

# If the Logger has handlers then it was already set up by the core code, else
# it needs setting up here.
if not logger.hasHandlers():
    level = logger.DEBUG  # So logger.info(...) is equivalent to print()

    logger.setLevel(level)
    logger_channel = logger.StreamHandler()
    logger_formatter = logger.Formatter(f'%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d:%(funcName)s: %(message)s')
    logger_formatter.default_time_format = '%Y-%m-%d %H:%M:%S'
    logger_formatter.default_msec_format = '%s.%03d'
    logger_channel.setFormatter(logger_formatter)
    logger.addHandler(logger_channel)

#LOGGING_ENABLED = True # Set to True to enable logging, or False to disable

localhost_var = tk.IntVar() 
logging_var = tk.IntVar()
speech_var = tk.IntVar() 
ip_var = tk.StringVar()
port_var = tk.IntVar()
status_var = tk.StringVar()


ip_var = (config.get_str("KillsTracker_IP") or "127.0.0.1")
port_var = (config.get_int("KillsTracker_PORT") or 5000)
logging_var = (config.get_int("KillsTracker_LOG") or False)
localhost_var = ( config.get_int("KillsTracker_LOCALHOST") or False)
speech_var = (config.get_int("KillsTracker_SPEECH") or False)


#Log All ConfigVariables to debug console
logger.info("Initial Settings")
logger.info(f"KillsTracker_IP: {ip_var}")
logger.info(f"KillsTracker_PORT: {port_var}")
logger.info(f"KillsTracker_LOG: {logging_var}")
logger.info(f"KillsTracker_LOCALHOST: {localhost_var}")
logger.info(f"KillsTracker_SPEECH: {speech_var}")
logger.info(f"KillsTracker_URL: {config.get_str('KillsTracker_URL')}")

if logging_var:
    LOGGING_ENABLED = True
    logger.info("Logging Enabled")

POST_URL = config.get_str("KillsTracker_URL")

def send_kill_data(kill_data):
    try:
        #POST_URL = "http://10.0.0.90:5050/new_kill"        
        #POST_URL = config.get("KillsTracker_URL") or ""
        LOGGING_ENABLED = logging_var
        if LOGGING_ENABLED:
            logger.info(f"'Web call to:{POST_URL}")
        response = requests.post(POST_URL, json=kill_data)
        response.raise_for_status()

        if LOGGING_ENABLED:
               #logger.info(f'Detected event: {entry["event"]}')
            logger.info(kill_data)
            #logger.info('Web call to update kills was successful')
    except requests.exceptions.RequestException as e:
        if LOGGING_ENABLED:
            logger.error(f'Web call to update kills failed: {str(e)}')

def test_http_post():
    test_data = {'test': 'This is a test post from the EDMC plugin.'}
    send_kill_data(test_data)

def create_kill_data(entry, system,station,cmdr):
    return {
         'system': system,
	 'station': station,
	 'cmdr': cmdr,
	 'entry': entry,
        'timestamp': entry['timestamp'],
	'event': entry['event'],
        'eventType': entry['event'],
        'shipType': entry['Target'] if 'Target' in entry else entry['Ship_Localised'] if 'Ship_Localised' in entry else 'Unknown',
        'Faction': entry['VictimFaction'] if 'VictimFaction' in entry else 'Unknown',
        'bountyAmount': entry['TotalReward'] if 'TotalReward' in entry else 0,
        'AwardingFaction': entry['AwardingFaction'] if 'AwardingFaction' in entry else 'Unknown',
        'VictimFaction': entry['VictimFaction'] if 'VictimFaction' in entry else 'Unknown',
        'Rewards': entry['Rewards'] if 'Rewards' in entry else 0,
        'System': system if system is not None else '',
        'Station': station if station is not None else '',
        'Cmdr': cmdr if cmdr is not None else '',
	'Ship': entry['Ship'] if 'Ship' in entry else 0,
	'Ship_Localised': entry['Target_Localised'] if 'Target_Localised' in entry else 0,
	'shipName': entry['Target_Localised'] if 'Target_Localised' in entry else 0,
	'Bounty': entry['Bounty'] if 'Bounty' in entry else 0,
	'PilotName': entry['PilotName'] if 'PilotName' in entry else '',
	'LegalStatus': entry['LegalStatus'] if 'LegalStatus' in entry else '',
	'Faction': entry['Faction'] if 'Faction' in entry else '',
	'PilotRank': entry['PilotRank'] if 'PilotRank' in entry else '',
	'PilotName_Localised': entry['PilotName_Localised'] if 'PilotName_Localised' in entry else '',
	'Target': entry['Target'] if 'Target' in entry else '',
	'Target_Localised': entry['Target_Localised'] if 'Target_Localised' in entry else ''
    }

def create_bounty_data(entry, system, station, cmdr):
    return {
        'system': system,
	    'station': station,
	    'cmdr': cmdr,
        'event': 'Bounty',
        'timestamp': entry['timestamp'],
        'Ship' : entry['Target_Localised'] if 'Target_Localised' in entry else entry['Target'].title(),
        'bountyAmount' :  entry['TotalReward'] if 'TotalReward' in entry else 0,
        'Rewards' : entry['Rewards'] if 'Rewards' in entry else 0,
        'VictimFaction': entry['VictimFaction'] if 'VictimFaction' in entry else 'Unknown'
    }

def create_factionkillbond_data(entry, system, station, cmdr):
    return {
        'system': system,
	    'station': station,
	    'cmdr': cmdr,
        'event': 'FactionKillBond',
        'timestamp': entry['timestamp'],
        'bountyAmount' : entry['Reward'] if 'Reward' in entry else 0,
        'VictimFaction': entry['VictimFaction'] if 'VictimFaction' in entry else 'Unknown',
        'AwardingFaction': entry['AwardingFaction'] if 'AwardingFaction' in entry else 'Unknown',
    }

def create_shiptargeted_data(entry, system,station,cmdr):
    
    return {
        'system': system,
	    'station': station,
	    'cmdr': cmdr,
        'event': 'ShipTargeted',
        'timestamp': entry['timestamp'],
        'Ship' : entry['Target_Localised'] if 'Ship_Localised' in entry else entry['Ship'].title(),
        'bountyAmount' : entry['Bounty'] if 'Bounty' in entry else 0,
        'VictimFaction': entry['Faction'] if 'Faction' in entry else 'Unknown',
        'PilotName': entry['PilotName_Localised'] if 'PilotName' in entry else '',
	    'LegalStatus': entry['LegalStatus'] if 'LegalStatus' in entry else '',
        'PilotRank': entry['PilotRank'] if 'PilotRank' in entry else ''
    }


def plugin_start3(plugin_dir: str) -> Tuple[str, str, str]:
    LOGGING_ENABLED = config.get_bool("KillsTracker_LOG") or False     
    if LOGGING_ENABLED:
        log_file_path = os.path.join(plugin_dir, 'ship_kills_plugin.log')
        logging.basicConfig(filename=log_file_path, level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

    #test_http_post()
    return PLUGIN_NAME

def journal_entry(cmdr, is_beta, system, station, entry, state):
    LOGGING_ENABLED = True
    if LOGGING_ENABLED:
           logger.info(f'Detected event: {entry["event"]}')
           logger.info(entry)
    event = entry['event']           
    if event in ['Bounty', 'FactionKillBond', 'ShipTargeted']:
       if (event == 'Bounty'):
           kill_data = create_bounty_data(entry, system, station, cmdr)
           send_kill_data(kill_data)

       if (event == 'FactionKillBond'):
           kill_data = create_factionkillbond_data(entry, system, station, cmdr)
           send_kill_data(kill_data)

       if (event == 'ShipTargeted'):
           if entry['TargetLocked']==True:
              kill_data = create_shiptargeted_data(entry, system, station, cmdr)
              send_kill_data(kill_data)
              logger.info("Ship Targeted event sent")
           else:
              logger.info("Ship Targeted event not sent, TargetLocked is False")

       #kill_data = create_kill_data(entry,system,station,cmdr)
       #send_kill_data(kill_data)

def plugin_prefs(parent: nb.Notebook, cmdr: str, is_beta: bool) -> Optional[tk.Frame]:
    frame = nb.Frame(parent)
    frame = create_new_prefs_ui(frame)
    return frame

def prefs_changed(cmdr: str, is_beta: bool) -> None:
 """
 Save settings.
 """
 try:
   config.set("KillsTracker_IP", ip_var.get())
   config.set("KillsTracker_PORT", port_var.get())


   config.set('KillsTracker_SPEECH', speech_var.get())
   config.set('KillsTracker_LOCALHOST', localhost_var.get())
   config.set('KillsTracker_LOG', logging_var.get())


   scheme = "http"
   url_with_path = f"{scheme}://{ip_var.get()}:{port_var.get()}/new_kill"
   
   #config.set("KillsTracker_LOG", logging_var)      
   #config.set("KillsTracker_SPEECH", speech_var)      
   #config.set("KillsTracker_LOCALHOST", localhost_var)      
   config.set("KillsTracker_URL", url_with_path)
   #if LOGGING_ENABLED:   
   logger.info("IS KillsTracker preferences saved.")
 except Exception as e:
   #if LOGGING_ENABLED:
   logger.info("KillsTracker preferences could not be saved.")
   logger.info(e)





def create_new_prefs_ui(frame):
        
        global localhost_var 
        global logging_var
        global speech_var
        global ip_var
        global port_var
        global status_var


        ip_var = tk.StringVar(value=config.get_str("KillsTracker_IP"))  # Retrieve saved value from config
        port_var = tk.IntVar(value=config.get_int("KillsTracker_PORT") or 5000)
        logging_var = tk.IntVar()
        logging_var.set(config.get_int("KillsTracker_LOG"))
        localhost_var = tk.IntVar()
        localhost_var.set(value=config.get_int("KillsTracker_LOCALHOST"))
        speech_var = tk.IntVar()
        speech_var.set(config.get_int("KillsTracker_SPEECH"))


        root = frame
        btnGetMyIP=nb.Button(root)        
        #btnGetMyIP["justify"] = "center"
        btnGetMyIP["text"] = "Get My IP"
        btnGetMyIP.place(x=120,y=280,width=100,height=25)

        lblSettings=nb.Label(root,justify="left",text="Plugin Settings")
        lblSettings.place(x=10,y=10,width=140,height=25)

        cbLogging=nb.Checkbutton(root, variable=logging_var)
        #cbLogging["justify"] = "left"
        cbLogging["text"] = "Enable Logging"
        cbLogging.place(x=10,y=30,width=140,height=25)
        #cbLogging["offvalue"] = "False"
        #cbLogging["onvalue"] = "True"
        
        

        lblServerSetting=nb.Label(root)
        #lblServerSetting["justify"] = "left"
        lblServerSetting["text"] = "Server Settings"
        lblServerSetting.place(x=10,y=90,width=140,height=25)

        cbSpeech=nb.Checkbutton(root, variable=speech_var)
        #cbSpeech["justify"] = "left"
        cbSpeech["text"] = "Enable Speech"
        cbSpeech.place(x=10,y=110,width=140,height=25)
        #cbSpeech["offvalue"] = "False"
        #cbSpeech["onvalue"] = "True"
        

        lblNetworkSettings=nb.Label(root)
        #lblNetworkSettings["justify"] = "left"
        lblNetworkSettings["text"] = "Network Settings"
        lblNetworkSettings.place(x=10,y=160,width=160,height=25)

        cbLocalHost=nb.Checkbutton(root, variable=localhost_var)
        #cbLocalHost["justify"] = "left"
        cbLocalHost["text"] = "Use Localhost"
        cbLocalHost.place(x=10,y=190,width=140,height=25)
        #cbLocalHost["offvalue"] = "False"
        #cbLocalHost["onvalue"] = "True"
        

        lblIPAddress=nb.Label(root)
        #lblIPAddress["justify"] = "right"
        lblIPAddress["text"] = "Detected IP:"
        lblIPAddress.place(x=10,y=230,width=70,height=25)

        edtIPAddress=nb.Entry(root, textvariable=ip_var)
        edtIPAddress.place(x=90,y=230,width=92,height=30)


        lblPort=nb.Label(root)
        #lblPort["justify"] = "right"
        lblPort["text"] = "Server Port"
        lblPort.place(x=180,y=230,width=70,height=25)

        edtPort=nb.Entry(root, textvariable=port_var)                        
        edtPort.place(x=260,y=230,width=52,height=30)

        lblServer=nb.Label(root)
        #lblServer["justify"] = "left"
        lblServer["text"] = "Server Address:"        
        lblServer.place(x=360,y=230,width=270,height=25)


        btnTestServer=nb.Button(root)
        btnTestServer["text"] = "Test Server"
        btnTestServer.place(x=10,y=280,width=100,height=25)

        lblMessage=nb.Label(root)
        #ft = tkFont.Font(family='Times',size=8)
        #lblMessage["font"] = ft
        #memMessage["fg"] = "#333333"
        #lblMessage["justify"] = "left"
        lblMessage["text"] = "Status"
        lblMessage.place(x=10,y=310, width=600, height=25)


        #POST_URL = config.get_str("KillsTracker_URL") or "http://127.0.0.1:5000/new_kill"
 





        target_url_var  = "Server Address: http://" + f"{ip_var.get()}" + ":" + f"{port_var.get()}"
        lblServer["text"] = target_url_var

        #edtIPAddress.delete(0, tk.END)
        #edtIPAddress.insert(0, f"{ip_var}")

        #btnGetMyIP["command"] = btnSaveCommand(lblMessage,edtIPAddress.get(),edtPort.get(),localhost_var, logging_var  , speech_var)
        btnGetMyIP["command"] = lambda :  edtIPAddress.config(text = get_current_ip())
        btnTestServer["command"] = lambda : lblMessage.config(text=cbTestServerClicked(lblMessage,edtIPAddress,edtPort))
        cbSpeech["command"] = lambda : lblMessage.config(text=cbSpeechClicked(speech_var))
        cbLocalHost["command"] = lambda : lblMessage.config(text=cbLocalHostClicked(edtIPAddress,localhost_var.get(),ip_var,lblServer))
        cbLogging["command"] = lambda : lblMessage.config(text=cbLoggingClicked(logging_var.get()))

        return root



def cbTestServerClicked(lblMessage,edtIPAddress,edtPort):
    try:
        parsed_host = edtIPAddress.get() 
        parsed_port = edtPort.get() 
        scheme = "http"
        url_without_path = f"{scheme}://{parsed_host}:{parsed_port}"
        
        lblMessage.config(fg="black")
        lblMessage.config(text="Testing" + url_without_path)
        #status_var.set("Testing" + url_without_path)
        response = requests.get(url_without_path)        
        if response.status_code == 200:
           result = ("Connection successful!")
           lblMessage.config(fg="green")
        else:
            #if(LOGGING_ENABLED == True):
            logger.debug("Error", "Connection failed.")
    except Exception as e:
        result = (f"Connection failed! {e}")
        lblMessage.config(fg="red")
        #if(LOGGING_ENABLED == True):
        logger.debug("Error", f"Connection failed: {e}")
    return result



    

def cbLocalHostClicked(edtIPAddress,localhost_var,ip_var,lblServer):
        #global localhost_var
        #global ip_var
        if (localhost_var == True):
            ip_var.set( '127.0.0.1')
            result = "Use Localhost"
        else:
             ip_var.set(get_current_ip())
             result = "Use dedicated IP"

        target_url_var  = "Server Address: http://" + f"{ip_var.get()}" + ":" + f"{port_var.get()}"
        lblServer["text"] = target_url_var
             

        return result


def cbSpeechClicked(speech_var):
    global ip_var
    global port_var
    parsed_host = ip_var.get()
    parsed_port = port_var.get()
    scheme = "http"    

    if (speech_var == True):
        result = "Speech Enabled"
        url = f"{scheme}://{parsed_host}:{parsed_port}/speech_enable"
        response = requests.get(url)
        if response.status_code == 200:
              result = ("Speech Enabled!")
    else:
        result = "Speech Disabled"
        url = f"{scheme}://{parsed_host}:{parsed_port}/speech_disable"
        response = requests.get(url)        
        if response.status_code == 200:
              result = ("Speech Disabled!")
    return result

def cbLoggingClicked(logging_var):
    if (logging_var == True):
        result = "Logging Enabled" 
    else:
        result = "Logging Disabled"        
    return result




#def get_current_ip(url_entry, port_entry, logging_var):
def get_current_ip():
    ip = socket.gethostbyname(socket.gethostname())
    return ip
    
    
