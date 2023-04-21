import json
import random
import requests
from datetime import datetime
import time
import re


def get_ship_types():
    with open('static/shiptypes.json', 'r') as file:
        ship_types = json.load(file)
    return ship_types
    
def generate_sample_kill():
    factions = ['Faction A', 'Faction B', 'Faction C']
    shipTypes = ['Eagle','federation_dropship','cobramkiii','federation_dropship_mkii','viper','cobramkiv','federation_dropship','viper_mkiv','empire_trader','federation_gunship','ferdelance','diamondbackxl','diamondback','krait_light']
    #get_ship_types()
    event_types = ['Bounty', 'PVPKill', 'FactionKillBond']
    
    sample_kill = {
        'timestamp': datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'faction': random.choice(factions),
        'VictimFaction': random.choice(factions),
        'shipType': random.choice(shipTypes),
        'eventType': random.choice(event_types),
        'bountyAmount': random.randint(10000, 100000),
        "Rewards": [ {"Faction":"Federation", "Reward":1000 }, {"Faction":"Nuenets Corp.", "Reward": 10280} ]
    }
    return sample_kill

def send_test_data(event):
    url = 'http://127.0.0.1:5050/new_kill'
    headers = {'Content-Type': 'application/json'}
    #response = requests.post(url, data=json.dumps(event), headers=headers)
    print (event)
    response = requests.post(url, data=event, headers=headers)

    if response.status_code == 200:
        print("Data sent successfully.")
    else:
        print("Failed to send data. Status code:", response.status_code)


def read_events_from_file(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    return [line.strip() for line in lines if line.strip() != '']


def process_events(events, interval):
    for full_event in events:        
        if full_event.find("timestamp") != -1:
          
          #get all characters after character 32
          event = full_event[31:]
          #print (event)
          try:
            # Process the event and send it to the server
            # [OrderedDict([("Faction", "NULL"), ("Reward", 582694)]), OrderedDict([("Faction", "Seurici Monarchy"), ("Reward", 219950)]), OrderedDict([("Faction", "Community of the Vault"), ("Reward", 296393)])]
            # [OrderedDict([("Faction", "NULL"), ("Reward", 582694)]), OrderedDict([("Faction", "Seurici Monarchy"), ("Reward", 219950)]), OrderedDict([("Faction", "Community of the Vault"), ("Reward", 296393)])]
            # [{[{"Faction": "NULL"}, {"Reward":, 876395}]}],
            #  [{"Faction": "NULL"}, {"Reward": 378485}]}]
            event = event.replace("'","\"").replace(": True", ": \"True\"").replace(": False", ": \"False\"").replace("$npc_name_decorate:#name=", "")

            if event.find('OrderedDict') != -1:
                event = event.replace("OrderedDict(", "{").replace(")", "}").replace("(", "{")
                event = event.replace("[[{}", "[{").replace("[{[{","[{").replace("}]}]","}]").replace("}, {"," , ")                
                event = event.replace("\"Faction\",","\"Faction\":").replace("\"Reward\"," ,"\"Reward\":").replace("] , ["," , ")
                #event = event.replace("}] , [{\"Fa","),(\"Fa").replace("[{","[(").replace("}]",")]")
            
            jsonEvent = json.loads(event)
            eventType = jsonEvent['event']
            print (eventType)
            # if event contains string 'Bounty' then modify the string to make it valid json
            if eventType == 'Bounty':
               #modified_str = event.replace("\"Faction\",","\"Faction\":").replace("\"Reward\"," ,"\"Reward\":")
               #modified_str = modified_str.replace("OrderedDict(", "{").replace(")", "}").replace("(", "{")
               #modified_str = modified_str.replace("[[{}", "[{").replace("[{[{","[{").replace("}]}]","}]").replace("}, {"," , ")                
                send_test_data(event)
                time.sleep(interval)


            if eventType == 'ShipTargeted':
                if jsonEvent['TargetLocked'] == "True":
                    if jsonEvent['ScanStage'] == 3:
                        #print (jsonEvent)
                        if jsonEvent['LegalStatus'] == "Wanted":
                            send_test_data(event)
                            time.sleep(interval)






          except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}: {event}")
            

            continue
        






def main():
    file_path = 'ship_kills_plugin.log'
    events = read_events_from_file(file_path)
    interval = 0.2  # Set the interval in seconds
    process_events(events, interval)



    #sample_kill = generate_sample_kill()
    #send_sample_kill(sample_kill)


if __name__ == '__main__':
    main()
