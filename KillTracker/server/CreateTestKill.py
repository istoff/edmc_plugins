import json
import random
import requests
from datetime import datetime


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
    print (sample_kill)
    return sample_kill

def send_sample_kill(sample_kill):
    url = 'http://127.0.0.1:5000/new_kill'
    headers = {'Content-Type': 'application/json'}
    response = requests.post(url, data=json.dumps(sample_kill), headers=headers)

    if response.status_code == 200:
        print("Data sent successfully.")
    else:
        print("Failed to send data. Status code:", response.status_code)

def main():
    sample_kill = generate_sample_kill()
    send_sample_kill(sample_kill)


if __name__ == '__main__':
    main()
