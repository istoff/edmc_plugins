import os
import socket
import requests
import json
import logging
from typing import Tuple
from typing import Optional
import tkinter as tk
from tkinter.ttk import Notebook
import myNotebook as nb
from config import config
import plug
from urllib.parse import urlparse


PLUGIN_NAME = "KillsTracker"
PLUGIN_VERSION = "0.4"
TARGET_URL = "http://127.0.0.1:5050/new_kill"
#TARGET_URL = "http://10.0.0.90:5050/new_kill"

LOGGING_ENABLED = False # Set to True to enable logging, or False to disable



def send_kill_data(kill_data):
    try:
        response = requests.post(TARGET_URL, json=kill_data)
        response.raise_for_status()

        if LOGGING_ENABLED:
            logging.info('Web call to update kills was successful')
    except requests.exceptions.RequestException as e:
        if LOGGING_ENABLED:
            logging.error(f'Web call to update kills failed: {str(e)}')

def test_http_post():
    test_data = {'test': 'This is a test post from the EDMC plugin.'}
    send_kill_data(test_data)

def create_kill_data(entry, system,station,cmdr):
    logging.info (entry)
    return {
        'timestamp': entry['timestamp'],
        'eventType': entry['event'],
        'shipType': entry['Target'] if 'Target' in entry else 'Unknown',
        'Faction': entry['VictimFaction'] if 'VictimFaction' in entry else 'Unknown',
        'bountyAmount': entry['TotalReward'] if 'TotalReward' in entry else entry['Reward'],
        'AwardingFaction': entry['AwardingFaction'] if 'AwardingFaction' in entry else 'Unknown',
        'VictimFaction': entry['VictimFaction'] if 'VictimFaction' in entry else 'Unknown',
        'Rewards': entry['Rewards'] if 'Rewards' in entry else 0,
        'System': system if system is not None else '',
        'Station': station if station is not None else '',
        'Cmdr': cmdr if cmdr is not None else ''
    }

def plugin_start3(plugin_dir: str) -> Tuple[str, str, str]:

    if LOGGING_ENABLED:
        log_file_path = os.path.join(plugin_dir, 'ship_kills_plugin.log')
        logging.basicConfig(filename=log_file_path, level=logging.DEBUG, format='%(asctime)s [%(levelname)s] %(message)s')

    #test_http_post()
    return PLUGIN_NAME

def journal_entry(cmdr, is_beta, system, station, entry, state):
    if LOGGING_ENABLED:
           logging.info(f'Detected event: {entry["event"]}')
           logging.info(entry);
    if entry['event'] in ['Bounty', 'PVPKill', 'FactionKillBond']:
        if LOGGING_ENABLED:
            logging.info(f'Detected event: {entry["event"]}')
        kill_data = create_kill_data(entry,system,station,cmdr)
        
        send_kill_data(kill_data)

def plugin_prefs(parent: nb.Notebook, cmdr: str, is_beta: bool) -> Optional[tk.Frame]:
    frame = nb.Frame(parent)
    frame = create_prefs_ui(frame)
    return frame

def create_prefs_ui(frame):
    frame.columnconfigure(0, weight=1, minsize=30)
    frame.columnconfigure(1, weight=2, minsize=100)
    frame.columnconfigure(2, weight=1, minsize=150)

    url_label = tk.Label(frame, text="URL:")
    url_label.grid(row=0, column=0, padx=5, pady=5, sticky=tk.W)

    
    url_entry = tk.Entry(frame,  width=80)
    url_entry.grid(row=0, column=1, padx=5, pady=5)
    url_entry.insert(0, config.get_str("KillsTracker_URL") or "")


    localhost_button = tk.Button(frame, text="Set Localhost URL", command=lambda: set_localhost(url_entry))
    localhost_button.grid(row=1, column=0, padx=5, pady=5, sticky=tk.W)

    current_ip_button = tk.Button(frame, text="Set Current IP URL", command=lambda: set_current_ip(url_entry))
    current_ip_button.grid(row=1, column=1, padx=5, pady=5)

    test_connection_button = tk.Button(frame, text="Test Connection", command=lambda: test_connection(url_entry, status_var, status_label))
    test_connection_button.grid(row=2, column=0, columnspan=1, padx=5, pady=5)

    status_var = tk.StringVar()
    status_label = tk.Label(frame, textvariable=status_var)
    status_label.grid(row=2, column=1, padx=5, columnspan = 2, pady=5, sticky="w")


    logging_var = tk.BooleanVar(value=config.get_bool("KillsTracker_logging") or False)

    logging_checkbutton = tk.Checkbutton(frame, text="Enable logging", variable=logging_var, command=lambda: toggle_logging(logging_var))
    logging_checkbutton.grid(row=3, column=0, columnspan=1, padx=5, pady=5)

    frame.columnconfigure(1, weight=1)
    return frame


def set_localhost(url_entry):
    url_entry.delete(0, tk.END)
    url_entry.insert(0, "http://localhost:5000/new_kill")
    config.set("KillsTracker_URL", url_entry.get())


def set_current_ip(url_entry):
    ip = socket.gethostbyname(socket.gethostname())
    url_entry.delete(0, tk.END)
    url_entry.insert(0, f"http://{ip}:5000/new_kill")
    config.set("KilsTracker_URL", url_entry.get())


def test_connection(url_entry: tk.Entry, status_var: tk.StringVar, status_label: tk.Label) -> None:
    try:
        parsed_url = urlparse(url_entry.get())
        url_without_path = f"{parsed_url.scheme}://{parsed_url.netloc}"
        status_label.config(fg="black")
        status_var.set("Testing")
        response = requests.get(url_without_path)        
        if response.status_code == 200:
           status_var.set("Connection successful!")
           status_label.config(fg="green")
        else:
            logging.debug("Error", "Connection failed.")
    except Exception as e:
        status_var.set("Connection failed! Check error details.")
        status_label.config(fg="red")
        logging.debug("Error", f"Connection failed: {e}")

def toggle_logging(logging_var):
    config.set_bool("KillsTracker_logging", logging_var.get())
