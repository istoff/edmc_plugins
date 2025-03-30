# createTestPowerplayMerits.py
# Test program to simulate PowerplayMerits events with persistent power and session tracking

import requests
import json
import random
from datetime import datetime
import os
import time

# List of Powers in Elite Dangerous
powers = [
    "Edmund Mahon",
    "Felicia Winters",
    "Zachary Hudson",
    "Zemina Torval",
    "Denton Patreus",
    "Aisling Duval",
    "Li Yong-Rui",
    "Archon Delaine",
    "Pranav Antal",
    "Yuri Grom"
]

# Server configuration - change this to match your server
SERVER_IP = "10.0.0.90"
SERVER_PORT = "5050"
SERVER_URL = f"http://{SERVER_IP}:{SERVER_PORT}/new_kill"

# Session tracking
session_file = "powerplay_session.json"
current_power = None
total_merits = 0
session_merits = 0

def load_session():
    global current_power, total_merits, session_merits
    if os.path.exists(session_file):
        try:
            with open(session_file, 'r') as f:
                data = json.load(f)
                current_power = data.get('power')
                total_merits = data.get('total_merits', 0)
                session_merits = data.get('session_merits', 0)
                print(f"Loaded session: {current_power}, {total_merits} total merits, {session_merits} this session")
        except Exception as e:
            print(f"Error loading session: {e}")
            current_power = None
            total_merits = 0
            session_merits = 0
    else:
        current_power = None
        total_merits = 0
        session_merits = 0

def save_session():
    try:
        with open(session_file, 'w') as f:
            json.dump({
                'power': current_power,
                'total_merits': total_merits,
                'session_merits': session_merits,
                'last_updated': datetime.now().isoformat()
            }, f)
    except Exception as e:
        print(f"Error saving session: {e}")

def create_powerplay_event():
    global current_power, total_merits, session_merits
    
    # If no power is selected, choose one randomly
    if not current_power:
        current_power = random.choice(powers)
        print(f"Selected new power: {current_power}")
    
    # Generate random merit values
    merits_gained = random.randint(1, 500)
    total_merits += merits_gained
    session_merits += merits_gained
    
    # Create the event data
    powerplay_data = {
        'timestamp': datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        'event': 'PowerplayMerits',
        'Power': current_power,
        'MeritsGained': merits_gained,
        'TotalMerits': total_merits,
        'system': 'Sol',
        'station': 'Abraham Lincoln',
        'cmdr': 'CMDR Test',
        
        # Additional fields for the web interface
        'meritsGained': merits_gained,
        'totalMerits': total_merits,
        'bountyAmount': merits_gained,  # Using merits as bounty for display
        'VictimFaction': current_power,  # Using Power as faction for display
        'AwardingFaction': current_power,  # Using Power as faction for display
        'Ship': 'None'
    }
    
    return powerplay_data

def send_test_event():
    """
    Send a test PowerplayMerits event
    """
    powerplay_data = create_powerplay_event()
    
    try:
        print(f"\nSending PowerplayMerits event to {SERVER_URL}")
        print(f"Power: {powerplay_data['Power']}")
        print(f"Merits gained: {powerplay_data['MeritsGained']}")
        print(f"Total merits: {powerplay_data['TotalMerits']}")
        print(f"Session merits: {session_merits}")
        
        response = requests.post(SERVER_URL, json=powerplay_data)
        
        if response.status_code == 200:
            print(f"Successfully sent PowerplayMerits event")
            save_session()
        else:
            print(f"Failed to send event. Status code: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error sending event: {str(e)}")

def change_power():
    global current_power, total_merits, session_merits
    
    print("\nAvailable Powers:")
    for i, power in enumerate(powers, 1):
        print(f"{i}. {power}")
    
    try:
        choice = int(input("Choose a power (1-10): "))
        if 1 <= choice <= len(powers):
            current_power = powers[choice-1]
            total_merits = int(input("Enter your current total merits: "))
            session_merits = 0
            print(f"Switched to {current_power} with {total_merits} merits")
            save_session()
        else:
            print("Invalid selection.")
    except ValueError:
        print("Please enter a valid number.")

def auto_generate_events():
    """
    Automatically generate events at regular intervals
    """
    count = int(input("How many events to generate? "))
    delay = float(input("Delay between events (seconds): "))
    
    print(f"\nGenerating {count} PowerplayMerits events with {delay}s delay...")
    
    for i in range(count):
        print(f"\nEvent {i+1}/{count}")
        send_test_event()
        if i < count - 1:  # Don't sleep after the last event
            time.sleep(delay)
    
    print("\nFinished generating events.")

if __name__ == "__main__":
    print("PowerplayMerits Test Program")
    print(f"Using server: {SERVER_URL}")
    
    # Load session data
    load_session()
    
    while True:
        # Display current status
        if current_power:
            print(f"\nCurrent power: {current_power}")
            print(f"Total merits: {total_merits}")
            print(f"Session merits: {session_merits}")
        else:
            print("\nNo power selected")
        
        # Menu options
        print("\n1. Send single PowerplayMerits event")
        print("2. Auto-generate multiple events")
        print("3. Change power")
        print("4. Reset session merits")
        print("5. Exit")
        
        choice = input("Enter choice (1-5): ")
        
        if choice == '1':
            send_test_event()
        elif choice == '2':
            auto_generate_events()
        elif choice == '3':
            change_power()
        elif choice == '4':
            session_merits = 0
            print("Session merits reset to 0")
            save_session()
        elif choice == '5':
            save_session()
            break
        else:
            print("Invalid choice. Please try again.")