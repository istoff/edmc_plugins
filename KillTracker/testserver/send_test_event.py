# test_server.py
import requests
import json
import sys

def send_test_event(event_file=None, event_type=None):
    """
    Send a test event to the server.
    Either provide a JSON file path or specify an event type.
    """
    server_url = "http://127.0.0.1:5050/new_kill"
    
    if event_file:
        # Load event from file
        with open(event_file, 'r') as f:
            data = json.load(f)
    elif event_type:
        # Create a simple test event based on type
        if event_type == "bounty":
            data = {
                "event": "Bounty",
                "entry": {
                    "event": "Bounty",
                    "timestamp": "2025-04-04T12:00:00Z",
                    "Target": "anaconda",
                    "Target_Localised": "Anaconda",
                    "TotalReward": 125000,
                    "VictimFaction": "Pirates",
                    "Rewards": [{"Faction": "Federation", "Reward": 125000}]
                },
                "system": "Sol",
                "station": "Test Station",
                "cmdr": "CMDR Tester"
            }
        elif event_type == "powerplay":
            data = {
                "event": "PowerplayMerits",
                "entry": {
                    "event": "PowerplayMerits",
                    "timestamp": "2025-04-04T12:00:00Z",
                    "Power": "Edmund Mahon",
                    "MeritsGained": 50,
                    "TotalMerits": 1050
                },
                "system": "Sol",
                "station": "Test Station",
                "cmdr": "CMDR Tester"
            }
        else:
            print(f"Unknown event type: {event_type}")
            return
    else:
        print("You must specify either an event file or event type")
        return
    
    # Send the data
    print(f"Sending data to {server_url}:")
    print(json.dumps(data, indent=2))
    
    try:
        response = requests.post(server_url, json=data)
        
        # Print the response
        print("\nResponse:")
        print(f"Status code: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Error sending data: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_server.py [file.json | bounty | powerplay]")
        sys.exit(1)
    
    arg = sys.argv[1]
    if arg.endswith('.json'):
        # Treat as a file
        send_test_event(event_file=arg)
    else:
        # Treat as an event type
        send_test_event(event_type=arg)