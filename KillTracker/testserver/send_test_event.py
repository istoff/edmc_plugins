# testShipLocker.py
# Test program to simulate ShipLocker events with PowerPlay commodities

import requests
import json
import random
from datetime import datetime

# Server configuration - change this to match your server
SERVER_IP = "127.0.0.1"
SERVER_PORT = "5050"
SERVER_URL = f"http://{SERVER_IP}:{SERVER_PORT}/new_kill"

# PowerPlay commodity templates
powerplay_commodities = [
    {"name": "Federal Aid", "baseName": "FederalAid"},
    {"name": "Corruption Reports", "baseName": "CorruptionReports"},
    {"name": "Marked Slaves", "baseName": "MarkedSlaves"},
    {"name": "Countermeasure Supplies", "baseName": "CountermeasureSupplies"},
    {"name": "Hudson Propaganda", "baseName": "HudsonPropaganda"},
    {"name": "Liberal Propaganda", "baseName": "LiberalPropaganda"},
    {"name": "Restriction Order", "baseName": "RestrictionOrder"},
    {"name": "Intelligence Package", "baseName": "IntelligencePackage"},
    {"name": "Garrison Supplies", "baseName": "GarrisonSupplies"},
    {"name": "Political Prisoners", "baseName": "PoliticalPrisoners"},
    {"name": "Lavigny's Political Materials", "baseName": "PoliticalMaterials"}
]

def create_shiplocker_event():
    """
    Create a simulated ShipLocker event with random PowerPlay commodities
    """
    # Generate random inventory items
    inventory = []
    
    # Add some random powerplay commodities
    num_powerplay_items = random.randint(0, 5)
    commodities_to_include = random.sample(powerplay_commodities, num_powerplay_items)
    
    for commodity in commodities_to_include:
        count = random.randint(1, 50)
        inventory.append({
            "Name": commodity["baseName"],
            "Name_Localised": commodity["name"],
            "Count": count,
            "Type": "Commodity"
        })
    
    # Add some regular commodities for realism
    regular_commodities = [
        {"Name": "Gold", "Name_Localised": "Gold", "Type": "Commodity"},
        {"Name": "Silver", "Name_Localised": "Silver", "Type": "Commodity"},
        {"Name": "Painite", "Name_Localised": "Painite", "Type": "Commodity"},
        {"Name": "VoidOpals", "Name_Localised": "Void Opals", "Type": "Commodity"}
    ]
    
    num_regular_items = random.randint(0, 3)
    for i in range(num_regular_items):
        commodity = random.choice(regular_commodities)
        count = random.randint(1, 20)
        inventory.append({
            "Name": commodity["Name"],
            "Name_Localised": commodity["Name_Localised"],
            "Count": count,
            "Type": commodity["Type"]
        })
    
    # Create the event data
    shiplocker_data = {
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": "ShipLocker",
        "entry": {
            "event": "ShipLocker",
            "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "Inventory": inventory
        },
        "system": "Sol",
        "station": "Abraham Lincoln",
        "cmdr": "CMDR Test"
    }
    
    return shiplocker_data

def send_test_event():
    """
    Send a test ShipLocker event
    """
    shiplocker_data = create_shiplocker_event()
    
    try:
        print(f"\nSending ShipLocker event to {SERVER_URL}")
        
        # Print the PowerPlay commodities that should be detected
        powerplay_items = []
        for item in shiplocker_data["entry"]["Inventory"]:
            name = item["Name"].lower()
            name_localized = item["Name_Localised"].lower()
            
            # Check if this is a potential PowerPlay commodity
            is_powerplay_item = False
            for keyword in ["propaganda", "aid", "supply", "prisoner", "report", "slaves", "political", "intelligence", "countermeasure", "garrison"]:
                if keyword in name or keyword in name_localized:
                    is_powerplay_item = True
                    break
            
            if is_powerplay_item:
                powerplay_items.append(f"{item['Name_Localised']}: {item['Count']}")
        
        print("PowerPlay commodities in this event:")
        if powerplay_items:
            for item in powerplay_items:
                print(f"- {item}")
        else:
            print("None")
        
        response = requests.post(SERVER_URL, json=shiplocker_data)
        
        if response.status_code == 200:
            print(f"Successfully sent ShipLocker event")
        else:
            print(f"Failed to send event. Status code: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error sending event: {str(e)}")

def clear_inventory():
    """
    Send an empty inventory to clear it
    """
    shiplocker_data = {
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": "ShipLocker",
        "entry": {
            "event": "ShipLocker",
            "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "Inventory": []
        },
        "system": "Sol",
        "station": "Abraham Lincoln",
        "cmdr": "CMDR Test"
    }
    
    try:
        print(f"\nSending empty ShipLocker event to clear inventory")
        
        response = requests.post(SERVER_URL, json=shiplocker_data)
        
        if response.status_code == 200:
            print(f"Successfully cleared inventory")
        else:
            print(f"Failed to send event. Status code: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error sending event: {str(e)}")

def send_custom_inventory():
    """
    Send a custom inventory with specific items and quantities
    """
    print("\nSend custom PowerPlay commodities")
    print("Enter commodity details (empty name to finish):")
    
    inventory = []
    while True:
        name = input("Commodity name (or empty to finish): ")
        if not name:
            break
        
        try:
            count = int(input(f"Count for {name}: "))
            
            # Find a matching base name or use a default
            base_name = name.replace(" ", "")
            for commodity in powerplay_commodities:
                if commodity["name"].lower() == name.lower():
                    base_name = commodity["baseName"]
                    break
            
            inventory.append({
                "Name": base_name,
                "Name_Localised": name,
                "Count": count,
                "Type": "Commodity"
            })
        except ValueError:
            print("Please enter a valid number")
    
    if not inventory:
        print("No items entered. Operation canceled.")
        return
    
    # Create the event data
    shiplocker_data = {
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": "ShipLocker",
        "entry": {
            "event": "ShipLocker",
            "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "Inventory": inventory
        },
        "system": "Sol",
        "station": "Abraham Lincoln",
        "cmdr": "CMDR Test"
    }
    
    try:
        print(f"\nSending custom ShipLocker event to {SERVER_URL}")
        
        response = requests.post(SERVER_URL, json=shiplocker_data)
        
        if response.status_code == 200:
            print(f"Successfully sent custom ShipLocker event")
        else:
            print(f"Failed to send event. Status code: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error sending event: {str(e)}")

def main():
    """
    Main menu for the ShipLocker test program
    """
    print("ShipLocker Event Test Program")
    print(f"Using server: {SERVER_URL}")
    
    while True:
        print("\n1. Send random ShipLocker event")
        print("2. Send custom ShipLocker inventory")
        print("3. Clear inventory")
        print("4. Exit")
        
        choice = input("Enter choice (1-4): ")
        
        if choice == '1':
            send_test_event()
        elif choice == '2':
            send_custom_inventory()
        elif choice == '3':
            clear_inventory()
        elif choice == '4':
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()