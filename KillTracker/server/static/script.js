/**
 * Elite Dangerous Kills Tracker - Main JavaScript
 * 
 * This script handles the tracking, display, and management of kills data
 * from Elite Dangerous through the EDMC plugin.
 */

// ======================================================================
// INITIALIZATION AND GLOBAL VARIABLES
// ======================================================================

// Socket connection setup
const socket = io.connect('http://' + document.domain + ':' + location.port);

// Data storage
let killDataList = [];        // Stores all kill data
let targeted_ships = [];      // Stores all currently targeted ships
let shipData = null;          // Ship reference data

// UI state
let sortMode = 'shipType';    // Current sort mode for ship grid
let enable_speech = false;    // Speech synthesis toggle
let currentPage = 1;          // Current page in the kills table pagination
let rowsPerPage = 10;         // Number of rows per page in the kills table

// Power variables
let currentPower = null;
let totalMerits = 0;
let sessionMerits = 0;

// Loop detection variables
let isSorting = false;
let lastKillDataSize = 0;
let loopDetectionCount = 0;
const MAX_LOOP_DETECTION = 5; // How many consecutive identical adds trigger loop detection

// Table sorting info
const tableSortInfo = {
  'factionBounties': { lastSortedColumnIndex: 1, sortOrder: 'desc' },
  'shipTypeBounties': { lastSortedColumnIndex: 1, sortOrder: 'desc' },
  'eventTypeBounties': { lastSortedColumnIndex: 1, sortOrder: 'desc' },
  'killsTable': { lastSortedColumnIndex: 0, sortOrder: 'desc' }
};

// UI element references
const mobileButton = document.getElementById("mobileButton");
const desktopButton = document.getElementById("desktopButton");

// ======================================================================
// EVENT LISTENERS AND INITIALIZATION
// ======================================================================

// Set up socket listeners when page loads
socket.on('connect', () => {
  console.log('Connected to the server.');
});

socket.on('disconnect', () => {
  console.log('Disconnected from the server.');
});

// Server test response
socket.on('test_server', () => {
  speakText('Server Test Successful');
});

// Data event listeners - most important part of the application
socket.on('powerplay_merits', function(data) {
  console.log('Received PowerplayMerits event:', data);
  handleNewKillData(data);
});
socket.on('new_kill', handleNewKillData);
socket.on('new_test', handleTestData);


// DOM loaded event to initialize the UI
document.addEventListener('DOMContentLoaded', function() {
  // Set default layout
  setActiveButton(desktopButton);
  
  // Load saved data with a slight delay to ensure DOM is ready
  setTimeout(() => {
    loadSavedData();
  }, 100);
  
  // Set up event listeners for UI controls
  document.getElementById('clearDataButton').addEventListener("click", clearAllData);
  document.getElementById('shipTypeBountiesGrid').addEventListener('click', cycleGridSortMode);
  
  // Add event listeners for table headers except kills table
  const tables = document.querySelectorAll('table:not(#killsTable)');
  tables.forEach(table => {
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
      header.addEventListener('click', () => {
        sortTable(table.id, index);
      });
    });
  });
  
  // Add a sort button to the kills table controls
  const pageControls = document.getElementById('pagePrefs');
  if (pageControls) {
    const sortButton = document.createElement('button');
    sortButton.className = 'button small';
    sortButton.textContent = 'Sort by Time';
    sortButton.onclick = sortKillsTable;
    pageControls.querySelector('.font-controls').appendChild(sortButton);
  }
  
  // Set up periodic cleanup of targeted ships
  setInterval(removeOldTargetedShips, 60 * 1000);
});

// Save data before unloading page
window.addEventListener('beforeunload', () => {
  console.log(`Saving ${killDataList.length} kills before unloading`);
  localStorage.setItem('killTracker', JSON.stringify(killDataList));
});

// Power Header Display and Merit Totals Reset
/**
 * Function to update the power status in the header
 * Call this whenever a PowerplayMerits event is received
 */
function updatePowerStatus(powerData) {
  if (!powerData || !powerData.Power) return;
  
  // Update the current power and merit counts
  currentPower = powerData.Power;
  totalMerits = powerData.totalMerits || powerData.TotalMerits || 0;
  
  // Add to session merits
  const meritsGained = powerData.meritsGained || powerData.MeritsGained || 0;
  sessionMerits += meritsGained;
  
  // Update the status display
  const powerStatusElement = document.getElementById('powerStatus');
  if (powerStatusElement) {
    powerStatusElement.innerHTML = `<span class="power-name">${currentPower}</span>: <span class="merits-total">${totalMerits.toLocaleString()}</span> total merits (<span class="merits-session">+${sessionMerits.toLocaleString()}</span> this session)`;
    powerStatusElement.style.display = 'block';
  }
}

/**
 * Reset session merits (for example, when clearing data)
 */
function resetSessionMerits() {
  sessionMerits = 0;
  const powerStatusElement = document.getElementById('powerStatus');
  if (powerStatusElement && currentPower) {
    powerStatusElement.innerHTML = `<span class="power-name">${currentPower}</span>: <span class="merits-total">${totalMerits.toLocaleString()}</span> total merits (<span class="merits-session">+${sessionMerits.toLocaleString()}</span> this session)`;
  } else if (powerStatusElement) {
    powerStatusElement.style.display = 'none';
  }
}


// ======================================================================
// DATA LOADING AND SAVING FUNCTIONS
// ======================================================================

/**
 * Load data from local storage and populate the tables
 */
function loadSavedData() {
  // Clear any existing data first to prevent duplication
  killDataList = [];
  clearAllTables();
  
  // Load data from localStorage
  const savedData = loadData('killTracker');
  
  // Check if we have valid data to load
  if (savedData && Array.isArray(savedData) && savedData.length > 0) {
    console.log(`Loading ${savedData.length} saved kills`);
    
    // Process each saved kill data entry
    savedData.forEach((killData) => {
      // Add to our data model without re-saving to localStorage
      addKillToDataModel(killData);
    });
    
    // Update the UI once after loading all data
    renderAllTables();
    console.log("Saved data loaded successfully");
  } else {
    console.log("No saved data found or data was invalid");
  }
}

/**
 * Add kill data to the data model without UI updates
 * This is used when loading from localStorage to prevent duplication
 */
function addKillToDataModel(killData) {
  // Add to the killDataList array only
  killDataList.push(killData);
}

/**
 * Save data to local storage
 */
function saveData(key, data) {
  console.log(`Saving ${data.length} items to ${key}`);
  const jsonSaveData = JSON.stringify(data);
  localStorage.setItem(key, jsonSaveData);
}

/**
 * Load data from local storage
 */
function loadData(key) {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error parsing data from localStorage key ${key}:`, e);
      return null;
    }
  }
  return null;
}

/**
 * Update all tables and visualizations based on the current data model
 */
function renderAllTables() {
  // Clear all UI elements
  clearAllTables();
  
  // Re-populate the kills table
  const killsTableBody = document.getElementById("killsTable").getElementsByTagName("tbody")[0];
  if (!killsTableBody) {
    console.error("Kills table body not found");
    return;
  }
  
  // Add each kill to the table
  killDataList.forEach(killData => {
    // Create a new row and cells
    let newRow = killsTableBody.insertRow(-1);
    let cell1 = newRow.insertCell(0);
    let cell2 = newRow.insertCell(1);
    let cell3 = newRow.insertCell(2);
    let cell4 = newRow.insertCell(3);
    let cell5 = newRow.insertCell(4);
    let cell6 = newRow.insertCell(5);

    // Add the row data to the cells
    cell1.innerHTML = killData.timestamp;
    cell2.innerHTML = killData.shipname || '';
    
    // Handle faction data based on event type
    if (killData.eventType === 'FactionKillBond') {
      cell3.textContent = killData.AwardingFaction || '';
    } else if (killData.eventType === 'Bounty' && killData.Rewards && killData.Rewards.length !== 0) {
      let rewardsText = killData.Rewards.map(reward => `${reward.Faction}: ${reward.Reward}`).join(', ');
      cell3.textContent = rewardsText;
    }

    cell4.innerHTML = killData.eventType || '';
    cell5.innerHTML = killData.VictimFaction || '';
    cell6.innerHTML = killData.bountyAmount || 0;
    
    // Update summary tables if not a ship targeted event
    if (killData.eventType !== 'ShipTargeted') {
      updateSummaryTables(killData);
    }
  });
  
  // Sort kills table by timestamp (newest first)
  sortKillsTable();
  
  // Update the table pagination
  renderTable();
}

// ======================================================================
// CORE DATA HANDLING FUNCTIONS
// ======================================================================


/**
 * New function to generate random speech for PowerplayMerits events
 * To add to the existing GenerateRandomSpeech function
 */
function GenerateRandomPowerplaySpeech(killData) {
  const power = killData.Power || '';
  const meritsGained = killData.meritsGained || killData.MeritsGained || 0;
  
  // Determine tier of contribution
  let tier = "standard";
  let tierPrefix = "";
  
  if (meritsGained > 300) {
    tier = "exceptional";
    tierPrefix = "";
  } else if (meritsGained > 200) {
    tier = "highValue";
    tierPrefix = "";
  } else if (meritsGained > 100) {
    tier = "notable";
    tierPrefix = "";
  } else if (meritsGained <= 99) {
    // Don't announce very small contributions
    return null;
  }
  
  // Arrays of phrases for different tiers
  const standardPhrases = [
    `${meritsGained} merits gained for ${power}`,
    `Working for ${power}, gained ${meritsGained} merits`,
    `${power} acknowledges your ${meritsGained} merit contribution`,
    `You've earned ${meritsGained} merits for ${power}`,
  ];
  
  const notablePhrases = [
    `Good work! ${meritsGained} merits for ${power}`,
    `${power} values your contribution of ${meritsGained} merits`,
    `Solid effort! ${meritsGained} merits gained for ${power}`,
    `${power} recognizes your dedication with ${meritsGained} merits`,
    `Notable contribution of ${meritsGained} merits for ${power}`,
    `${power} appreciates your ${meritsGained} merit contribution`,
  ];
  
  const highValuePhrases = [
    `Impressive effort! ${meritsGained} merits for ${power}`,
    `${power} highly values your ${meritsGained} merit contribution`,
    `Excellent work! ${meritsGained} merits gained for ${power}`,
    `${power} is pleased with your ${meritsGained} merit contribution`,
    `Major contribution of ${meritsGained} merits for ${power}`,
    `${power} acknowledges your ${meritsGained} merit contribution`,

  ];
  
  const exceptionalPhrases = [
    `Outstanding! ${meritsGained} merits for ${power}`,
    `${power} greatly appreciates your ${meritsGained} merit contribution`,
    `Exceptional work! ${meritsGained} merits for ${power}`,
    `Major contribution of ${meritsGained} merits will strengthen ${power}'s position`,
    `${power} is grateful for your ${meritsGained} merit contribution`,
    `Your ${meritsGained} merits for ${power} are truly exceptional`,
  ];
  
  // Select appropriate phrase set based on tier
  let phrases;
  switch(tier) {
    case "notable":
      phrases = notablePhrases;
      break;
    case "highValue":
      phrases = highValuePhrases;
      break;
    case "exceptional":
      phrases = exceptionalPhrases;
      break;
    default:
      phrases = standardPhrases;
  }
  
  // Select random phrase from the appropriate set
  const randomIndex = Math.floor(Math.random() * phrases.length);
  return tierPrefix + phrases[randomIndex];
}




/**
 * Handles new kill data received from the socket
 */
function handleNewKillData(killData) {
  // Set event type from event field for consistency
  killData.eventType = killData.event;
  
  // Update status display
  const label = document.getElementById('status');
  if (label) {
    label.textContent = `Cmdr ${killData.cmdr}: ${killData.system} ${killData.station}`;
  }

  // Process different event types
  if (killData.eventType === 'Bounty') {
    // Format bounty data
    killData.shipname = killData.Ship;
    killData.Faction = killData.VictimFaction;
    killData.shipImageFileName = killData.shipname.replace(/-/gi,"",).replace(/ /gi,"-");
    
    // Add to kill table and remove from targeted ships
    addKillTableRow(killData);
    removeTargetedShip(killData);
  } 
  else if (killData.eventType === 'FactionKillBond') {
    // Format kill bond data
    killData.shipname = '';
    addKillTableRow(killData);
  }
  else if (killData.eventType === 'ShipTargeted') {
    // Format ship targeted data
    killData.shipImageFileName = '';
    killData.Faction = killData.VictimFaction;
    killData.VictimFaction = `${killData.PilotName}: (${killData.PilotRank})`;
    
    // Only add high-value targets
    if (killData.bountyAmount > 500000) {
      addTargetedShip(killData);
    }
  }
else if (killData.eventType === 'PowerplayMerits') {
    // Format PowerplayMerits data
    killData.shipname = 'None';
    killData.Faction = killData.Power;
    killData.Power = killData.Power || 'Unknown Power';
    killData.meritsGained = killData.meritsGained || 0;
    killData.totalMerits = killData.totalMerits || 0;
    

    // Update the power status in the header
    updatePowerStatus(killData);

    // Add to kill table
    addKillTableRow(killData);
    
   // Get speech text - will be empty string if we should not announce
   const speechText = GenerateRandomSpeech('PowerplayMerits', killData);
    
   // Only speak if there's something to say (notable contributions)
   if (speechText) {
     speakText(speechText);
   }
}  

  // Update table sorting for other tables
  updateTableSorting();
}

/**
 * Handles test data from the server
 */
function handleTestData(TestData) {
  const killData = TestData;
  killData.eventType = killData.event;
  
  // Format data based on event type
  if (killData.eventType === 'Bounty' || killData.eventType === 'PVPKill') {
    killData.shipname = getshipnamefromShidId(killData.Target);
    killData.bountyAmount = killData.TotalReward;
    
    // Update UI and data
    const label = document.getElementById('status');
    if (label) {
      label.textContent = `Cmdr ${killData.Cmdr}: ${killData.System} ${killData.Station}`;
    }
    
    addKillTableRow(killData);
    removeTargetedShip(killData);
  } 
  else if (killData.eventType === 'FactionKillBond') {
    killData.shipname = '';
    killData.shipType = '';
    killData.shipImageFileName = '';
    
    // Update UI and data
    const label = document.getElementById('status');
    if (label) {
      label.textContent = `Cmdr ${killData.Cmdr}: ${killData.System} ${killData.Station}`;
    }
    
    addKillTableRow(killData);
  }
  else if (killData.eventType === 'ShipTargeted') {
    if (killData.Ship_Localised === 'undefined') {
      killData.Ship_Localised = sentenceCase(killData.Ship);
    }
    
    killData.shipname = killData.Ship_Localised;
    killData.shipType = killData.Ship;
    killData.shipImageFileName = '';
    killData.bountyAmount = killData.Bounty;
    killData.VictimFaction = `${killData.PilotName_Localised}: (${killData.PilotRank})`;
    killData.Faction = killData.Faction;
    
    addTargetedShip(killData);
  }
  
  // Update table sorting
  updateTableSorting();
}

/**
 * Adds a kill to the kills table and updates summaries
 */
function addKillTableRow(killData) {
  // Loop detection - check if the list size is unexpectedly growing
  if (killDataList.length === lastKillDataSize) {
    loopDetectionCount++;
    console.log(`Loop detection triggered: ${loopDetectionCount}/${MAX_LOOP_DETECTION}`);
    
    if (loopDetectionCount >= MAX_LOOP_DETECTION) {
      console.error("Potential infinite loop detected in kill data processing. Operation aborted.");
      loopDetectionCount = 0; // Reset for next time
      return; // Exit the function to break the loop
    }
  } else {
    // Reset detection counter if list size changed as expected
    loopDetectionCount = 0;
    lastKillDataSize = killDataList.length;
  }

  // Get the kills table body
  let killsTableBody = document.getElementById("killsTable").getElementsByTagName("tbody")[0];
  if (!killsTableBody) {
    console.error("Kills table body not found");
    return;
  }

  // Add the killData to the killDataList array
  killDataList.push(killData);
  lastKillDataSize = killDataList.length; // Update our tracking variable

  // Create a new row and cells
  let newRow = killsTableBody.insertRow(-1);
  let cell1 = newRow.insertCell(0);
  let cell2 = newRow.insertCell(1);
  let cell3 = newRow.insertCell(2);
  let cell4 = newRow.insertCell(3);
  let cell5 = newRow.insertCell(4);
  let cell6 = newRow.insertCell(5);

  // Add the row data to the cells
  cell1.innerHTML = killData.timestamp;
  cell2.innerHTML = killData.shipname || '';
  
  // Handle faction data based on event type
  if (killData.eventType === 'FactionKillBond') {
    cell3.textContent = killData.AwardingFaction || '';
  } else if (killData.eventType === 'Bounty' && killData.Rewards && killData.Rewards.length !== 0) {
    let rewardsText = killData.Rewards.map(reward => `${reward.Faction}: ${reward.Reward}`).join(', ');
    cell3.textContent = rewardsText;
  }

  cell4.innerHTML = killData.eventType || '';
  cell5.innerHTML = killData.VictimFaction || '';
  cell6.innerHTML = killData.bountyAmount || 0;

  // Update summary tables if not a ship targeted event
  if (killData.eventType !== 'ShipTargeted') {
    updateSummaryTables(killData);
  }
  
  // Update the table pagination
  renderTable();
}

/**
 * Adds a targeted ship to the targeted ships list
 */
function addTargetedShip(killData) {
  // Check if the ship has already been targeted
  const index = targeted_ships.findIndex(
    (ship) =>
      ship.Ship === killData.Ship &&
      ship.bountyAmount <= killData.bountyAmount
  );
  
  if (index === -1) {
    // Add the targeted ship if it is not already in the list
    killData.BountyUpdated = 0;
    targeted_ships.push(killData);
    
    // Play appropriate speech notification
    if (killData.amountBounty > 1000000) {
      speakText(GenerateRandomSpeech('ShipTargetedSuperRich', killData));
    } else {
      speakText(GenerateRandomSpeech('ShipTargeted', killData));
    }
    
    // Sort the list by descending bounty order
    targeted_ships.sort((a, b) => b.bountyAmount - a.bountyAmount);

    // Keep only the top 10 highest value ships
    if (targeted_ships.length > 10) {
      targeted_ships.pop();
    }
    
    RenderShipsTargettedTable();
  } else {
    // Update the bounty amount if the ship is already in the list
    if (killData.bountyAmount > targeted_ships[index].bountyAmount) {
      targeted_ships[index].bountyAmount = killData.bountyAmount;
      
      if (targeted_ships[index].BountyUpdated === 0) {
        speakText(GenerateRandomSpeech('KWS', killData));
      }
      
      targeted_ships[index].BountyUpdated = 1;
      targeted_ships[index].Faction = killData.Faction;
      targeted_ships[index].VictimFaction = killData.VictimFaction;
      
      RenderShipsTargettedTable();
    }
  }
}

/**
 * Removes a targeted ship from the list when it's destroyed
 */
function removeTargetedShip(killData) {
  const index = targeted_ships.findIndex(
    (ship) =>
      ship.Ship === killData.Ship &&
      ship.Faction === killData.Faction &&
      killData.bountyAmount - ship.bountyAmount < 10000
  );

  if (index !== -1) {
    speakText(GenerateRandomSpeech('Kill', killData));
    targeted_ships.splice(index, 1);
    console.log(`Removed: ${killData.shipname} from targeted_ships`);
  }
  
  RenderShipsTargettedTable();
}

/**
 * Removes targeted ships that are older than the time limit
 */
function removeOldTargetedShips() {
  const now = new Date();
  const timeLimit = 10 * 60 * 1000; // 10 minutes in milliseconds

  targeted_ships = targeted_ships.filter((ship) => {
    const shipTimestamp = new Date(ship.timestamp);
    const timeDifference = now - shipTimestamp;
    return timeDifference <= timeLimit;
  });
  
  RenderShipsTargettedTable();
}

/**
 * Updates all summary tables with new kill data
 */
function updateSummaryTables(killData) {
  // Update faction bounties table
  if (killData.eventType === 'FactionKillBond') {
    updateNestedTable('factionBounties', killData.AwardingFaction, killData.bountyAmount);
  } else if (killData.Rewards && killData.Rewards.length !== 0 && killData.eventType !== 'FactionKillBond') {
    for (const reward of killData.Rewards) {
      updateNestedTable('factionBounties', reward.Faction, reward.Reward);
    }
  }
  
  // Update ship type bounties table only for Bounty events with a ship
  if (killData.shipname != '' && killData.eventType === 'Bounty') {
    updateNestedTable('shipTypeBounties', killData.shipname, killData.bountyAmount);
  }
  
  // Update event type bounties table
  updateNestedTable('eventTypeBounties', killData.eventType, killData.bountyAmount);
  

  // Update PowerPlay merits table if it's a PowerplayMerits event
  if (killData.eventType === 'PowerplayMerits') {
    updatePowerPlayTable(killData);
  }

  // Update the visual grid
  updateShipTypeBountiesGrid();
}


/**
 * Update the PowerPlay merits table
 */
function updatePowerPlayTable(killData) {
  const powerPlayTable = document.getElementById('powerPlayMerits');
  if (!powerPlayTable) return;
  
  const power = killData.Power;
  const meritsGained = killData.meritsGained || 0;
  const totalMerits = killData.totalMerits || 0;
  
  let row = powerPlayTable.rows.namedItem(power);
  
  // Remove existing footer row if it exists
  if (powerPlayTable.tFoot) {
    powerPlayTable.removeChild(powerPlayTable.tFoot);
  }
  
  if (!row) {
    // Create new row for this power
    row = powerPlayTable.insertRow(-1);
    row.id = power;
    
    let nameCell = row.insertCell(0);
    nameCell.textContent = power;
    
    let meritCell = row.insertCell(1);
    meritCell.style.textAlign = "right";
    meritCell.textContent = totalMerits;
    
    let countCell = row.insertCell(2);
    countCell.style.textAlign = "right";
    countCell.textContent = 1;
    
    // Store the highest total merits as a data attribute on the row
    row.setAttribute('data-highest-merits', totalMerits);
  } else {
    // Update existing row with new merits count
    let countCell = row.cells[2];
    let currentCount = parseInt(countCell.textContent || 0);
    countCell.textContent = currentCount + 1;
    
    // Update total merits to the latest value
    row.cells[1].textContent = totalMerits;
    
    // Update highest merits if the current total is higher
    let highestMerits = parseInt(row.getAttribute('data-highest-merits') || 0);
    if (totalMerits > highestMerits) {
      row.setAttribute('data-highest-merits', totalMerits);
    }
  }
  
  // Create and insert footer row with totals
  const tfoot = powerPlayTable.createTFoot();
  const footerRow = tfoot.insertRow(-1);
  let totalEvents = 0;
  
  // Calculate total events across all powers
  for (let i = 1; i < powerPlayTable.rows.length - 1; i++) {
    if (powerPlayTable.rows[i].cells.length >= 3) {
      totalEvents += parseInt(powerPlayTable.rows[i].cells[2].textContent || 0);
    }
  }
  
  footerRow.insertCell(0).innerText = 'Total';
  const footerTotalMeritsCell = footerRow.insertCell(1);
  const footerTotalEventsCell = footerRow.insertCell(2);
  footerTotalMeritsCell.innerText = '-'; // No meaningful total for merits across powers
  footerTotalEventsCell.innerText = totalEvents;
  footerTotalMeritsCell.style.textAlign = "right";
  footerTotalEventsCell.style.textAlign = "right";
  
  // Apply the footer-row class to all cells in the footer row
  footerRow.cells[0].classList.add("footer-row");
  footerTotalMeritsCell.classList.add("footer-row");
  footerTotalEventsCell.classList.add("footer-row");
}

/**
 * Updates a nested summary table with new data
 */
function updateNestedTable(tableId, key, value) {
  if (!key) return; // Skip if key is undefined
  
  let table = document.getElementById(tableId);
  if (!table) return;
  
  let row = table.rows.namedItem(key);

  // Remove existing footer row if it exists
  if (table.tFoot) {
    table.removeChild(table.tFoot);
  }

  if (!row) {
    // Create new row if key doesn't exist
    row = table.insertRow(-1);
    row.id = key;

    let nameCell = row.insertCell(0);
    nameCell.textContent = key;

    let valueCell = row.insertCell(1);
    valueCell.style.textAlign = "right";
    valueCell.textContent = value;

    let countCell = row.insertCell(2);
    countCell.style.textAlign = "right";
    countCell.textContent = 1;
  } else {
    // Update existing row
    let currentValue = parseInt(row.cells[1].textContent.replace(/,/g, '') || 0);
    let currentCount = parseInt(row.cells[2].textContent || 0);
    row.cells[1].textContent = (currentValue + value);
    row.cells[2].textContent = currentCount + 1;
  }

  // Create and insert footer row with totals
  const tfoot = table.createTFoot();
  const footerRow = tfoot.insertRow(-1);
  let totalKills = 0;
  let totalBounty = 0;

  for (let i = 1; i < table.rows.length - 1; i++) {
    if (table.rows[i].cells.length >= 3) {
      totalBounty += parseInt(table.rows[i].cells[1].textContent.replace(/,/g, '') || 0);
      totalKills += parseInt(table.rows[i].cells[2].textContent || 0);
    }
  }

  footerRow.insertCell(0).innerText = 'Total';
  const footerTotalBountyCell = footerRow.insertCell(1);
  const footerTotalCell = footerRow.insertCell(2);
  footerTotalBountyCell.innerText = totalBounty.toLocaleString();
  footerTotalCell.innerText = totalKills;
  footerTotalBountyCell.style.textAlign = "right";
  footerTotalCell.style.textAlign = "right";

  // Apply the footer-row class to all cells in the footer row
  footerRow.cells[0].classList.add("footer-row");
  footerTotalBountyCell.classList.add("footer-row");
  footerTotalCell.classList.add("footer-row");
}

// ======================================================================
// UI UPDATE FUNCTIONS
// ======================================================================

/**
 * Updates the ship type bounties grid with data from the table
 */
function updateShipTypeBountiesGrid() {
  const shipTypeBountiesTable = document.getElementById('shipTypeBounties');
  const shipTypeBountiesGrid = document.getElementById('shipTypeBountiesGrid');
  
  if (!shipTypeBountiesTable || !shipTypeBountiesGrid) return;

  // Remove existing grid items
  while (shipTypeBountiesGrid.firstChild) {
    shipTypeBountiesGrid.removeChild(shipTypeBountiesGrid.firstChild);
  }

  // Get data from the shipTypeBounties table
  let data = [];
  for (let i = 1; i < shipTypeBountiesTable.rows.length - 1; i++) {
    if (shipTypeBountiesTable.rows[i].cells.length >= 3) {
      const row = shipTypeBountiesTable.rows[i];
      data.push({
        Ship: row.cells[0].innerText,
        bountyAmount: parseInt(row.cells[1].innerText.replace(/,/g, '') || 0),
        kills: parseInt(row.cells[2].innerText || 0),
        shipFileName: row.cells[0].innerText,
        shipname: row.cells[0].innerText
      });
    }
  }
    
  // Apply sorting based on the sortMode
  data.sort((a, b) => {
    switch (sortMode) {
      case 'shipType':
        return a.Ship.localeCompare(b.Ship);
      case 'kills':
        return b.kills - a.kills;
      case 'bounty':
        return b.bountyAmount - a.bountyAmount;
      default:
        return 0;
    }
  });

  // Standard ship names to filename mapping
  const shipNameMapping = {
    "Anaconda": "anaconda",
    "Federal Corvette": "federal-corvette",
    "Imperial Cutter": "imperial-cutter",
    "Python": "python",
    "Fer-de-Lance": "fer-de-lance",
    "Krait MkII": "krait-mkii",
    "Krait Phantom": "krait-phantom",
    "Type-9 Heavy": "type-9-heavy",
    "Type-10 Defender": "type-10-defender",
    "Alliance Chieftain": "alliance-chieftain",
    "Cobra MkIII": "cobra-mkiii",
    "Asp Explorer": "asp-explorer",
    "Vulture": "vulture",
    "Eagle": "eagle",
    "Viper MkIII": "viper-mkiii",
    "Viper MkIV": "viper-mkiv",
    "Sidewinder": "sidewinder",
    "Imperial Eagle": "imperial-eagle",
    "Federal Gunship": "federal-gunship",
    "Federal Assault Ship": "federal-assault-ship",
    "Federal Dropship": "federal-dropship",
    "Diamondback Explorer": "diamondback-explorer",
    "Diamondback Scout": "diamondback-scout",
    // Add more mappings as needed
  };

  // Create grid items based on the sorted data
  for (const item of data) {
    const gridItem = document.createElement('div');
    gridItem.className = "grid-item";
    
    // Normalize ship name and format file name
    let normalizedShipName = item.Ship.trim();
    let shipImageFilename = "";
    
    // Check if we have a direct mapping for this ship
    if (shipNameMapping[normalizedShipName]) {
      shipImageFilename = shipNameMapping[normalizedShipName];
    } else {
      // Apply standard normalization for unknown ships
      shipImageFilename = normalizedShipName
        .toLowerCase()
        .replaceAll(" ", "-")
        .replaceAll("_", "-")
        .replace(/[^\w\-]/g, ""); // Remove any special characters
    }
    
    // Make sure the filename is clean
    shipImageFilename = shipImageFilename.replace(/\s+/g, "-").toLowerCase();
    
    // Complete image path
    const shipImagePath = `static/images/${shipImageFilename}.png`;
    
    // For debugging
    console.log(`Ship: ${item.Ship}, Image path: ${shipImagePath}`);
    
    // Format display values
    let bountyValue = item.bountyAmount.toLocaleString() + ' credits';
    let numKills = item.kills + ' kill(s)';

    // Create a new card
    const card = document.createElement("div");
    card.className = "cards";
    card.id = 'card-container';

    // Create a new card image
    const cardImage = document.createElement("div");
    cardImage.className = "card-image";

    const image = document.createElement("img");
    image.src = shipImagePath;
    image.alt = item.Ship;
    
    // Add error handler to show a placeholder if image fails to load
    image.onerror = function() {
      console.log(`Failed to load image for ${item.Ship}`);
      this.src = 'static/images/unknown-ship.png'; // Placeholder image
      this.alt = 'Unknown Ship Type';
    };

    cardImage.appendChild(image);
    card.appendChild(cardImage);

    // Create card content
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = item.Ship;

    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = bountyValue;

    const killstext = document.createElement("p");
    killstext.className = "card-text";
    killstext.textContent = numKills;

    cardContent.appendChild(title);
    cardContent.appendChild(text);
    cardContent.appendChild(killstext);
    card.appendChild(cardContent);

    // Add the card to the grid item
    gridItem.appendChild(card);

    // Add the grid item to the grid
    shipTypeBountiesGrid.appendChild(gridItem);
  }
  
  addCardListener();
}


/**
 * Renders the targeted ships table
 */
function RenderShipsTargettedTable() {
  // Get the ShipsTargetted table body
  let ShipsTargettedTableBody = document.getElementById("ShipsTargettedTable")?.getElementsByTagName("tbody")[0];
  if (!ShipsTargettedTableBody) return;
  
  ShipsTargettedTableBody.innerHTML = '';
  
  // Loop through ships targetted list and add to table
  targeted_ships.forEach((ship) => {
    let newRow = ShipsTargettedTableBody.insertRow(-1);
    let cell1 = newRow.insertCell(0);
    let cell2 = newRow.insertCell(1);
    let cell3 = newRow.insertCell(2);
    let cell4 = newRow.insertCell(3);
    
    cell1.innerHTML = ship.Faction || '';
    cell2.innerHTML = ship.Ship || '';
    cell3.textContent = ship.VictimFaction || '';
    cell4.innerHTML = ship.bountyAmount || 0;
  });
}

/**
 * Generates a random row for testing with proper ship names
 */
function generateRandomRow() {
  const eventTypes = ["Bounty", "FactionKillBond"];
  const factions = ["Federation", "Empire", "Alliance", "Independent"];
  const ships = [
    "Anaconda", 
    "Federal Corvette", 
    "Python", 
    "Fer-de-Lance", 
    "Krait MkII", 
    "Vulture",
    "Eagle",
    "Viper MkIII",
    "Cobra MkIII",
    "Imperial Cutter"
  ];
  
  let randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  let randomShip = ships[Math.floor(Math.random() * ships.length)];
  let randomKillData;

  if (randomEventType === 'Bounty' || randomEventType === 'PVPKill') {
    randomKillData = {
      timestamp: new Date().toISOString(),
      eventType: randomEventType,
      faction: factions[Math.floor(Math.random() * factions.length)],
      bountyAmount: Math.floor(Math.random() * 1000000) + 10000,
      Target: randomShip,
      ShipName: randomShip,
      shipname: randomShip, // Add this for consistency
      victimFaction: factions[Math.floor(Math.random() * factions.length)],
      Faction: factions[Math.floor(Math.random() * factions.length)],
      VictimFaction: factions[Math.floor(Math.random() * factions.length)],
      Ship: randomShip, // Add this for tracking
      Rewards: [
        {'Faction': 'Federal Navy', 'Reward': Math.floor(Math.random() * 500000)}, 
        {'Faction': 'Alliance Assembly', 'Reward': Math.floor(Math.random() * 300000)}
      ]
    };
  } else if (randomEventType === 'FactionKillBond') {
    randomKillData = {
      timestamp: new Date().toISOString(),
      eventType: randomEventType,
      shipType: '',
      faction: factions[Math.floor(Math.random() * factions.length)],
      bountyAmount: Math.floor(Math.random() * 100000) + 1000,
      shipname: '',
      shipImageFileName: '',
      VictimFaction: factions[Math.floor(Math.random() * factions.length)],
      AwardingFaction: factions[Math.floor(Math.random() * factions.length)],
    };
  }
  
  addKillTableRow(randomKillData);
  updateTableSorting();
}


/**
 * Updates all table sorting based on last sort settings
 * Only call for tables other than killsTable to avoid loops
 */
function updateTableSorting() {
  // Only sort other tables, not the kills table
  const tablesToSort = Object.keys(tableSortInfo).filter(id => id !== 'killsTable');
  
  tablesToSort.forEach(tableId => {
    const { lastSortedColumnIndex } = tableSortInfo[tableId];
    sortTable(tableId, lastSortedColumnIndex, true);
  });
}

// ======================================================================
// TABLE AND PAGINATION FUNCTIONS
// ======================================================================

/**
 * Renders the kills table with pagination
 */
function renderTable() {
  const table = document.getElementById('killsTable');
  if (!table) return;
  
  const allRows = table.querySelectorAll('tbody tr');
  const totalPages = Math.ceil(allRows.length / rowsPerPage) || 1;

  // Hide all rows
  allRows.forEach(row => row.style.display = 'none');

  // Display the rows for the current page
  for (let i = (currentPage - 1) * rowsPerPage; i < currentPage * rowsPerPage && i < allRows.length; i++) {
    allRows[i].style.display = '';
  }

  // Update the page navigation display
  const currentPageElement = document.getElementById('currentPage');
  const totalPagesElement = document.getElementById('totalPages');
  
  if (currentPageElement) currentPageElement.innerText = currentPage;
  if (totalPagesElement) totalPagesElement.innerText = totalPages;
}

/**
 * Go to the previous page in the table
 */
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

/**
 * Go to the next page in the table
 */
function nextPage() {
  const table = document.getElementById('killsTable');
  if (!table) return;
  
  const allRows = table.querySelectorAll('tbody tr');
  const totalPages = Math.ceil(allRows.length / rowsPerPage) || 1;

  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

/**
 * Update how many rows are shown per page
 */
function updateRowsPerPage(newRowsPerPage) {
  rowsPerPage = parseInt(newRowsPerPage, 10);
  currentPage = 1;
  renderTable();
}

/**
 * Sort kills table by timestamp (newest first)
 */
function sortKillsTable() {
  if (isSorting) return; // Prevent multiple simultaneous sorts
  
  isSorting = true;
  console.log("Sorting kills table");
  
  try {
    const table = document.getElementById('killsTable');
    if (!table) {
      console.error("Kills table not found");
      return;
    }
    
    const tfoot = table.tFoot;
    const tbody = table.querySelector('tbody');
    if (!tbody) {
      console.error("Kills table body not found");
      return;
    }
    
    const rows = Array.from(tbody.rows);
    if (rows.length === 0) {
      console.log("No rows to sort");
      return;
    }
    
    // Sort by timestamp (column 0) in descending order
    rows.sort((a, b) => {
      try {
        const aValue = new Date(a.cells[0].textContent.trim()).getTime();
        const bValue = new Date(b.cells[0].textContent.trim()).getTime();
        return bValue - aValue; // Descending order (newest first)
      } catch (err) {
        console.error("Error comparing dates:", err);
        return 0;
      }
    });
    
    // Clear the table body first to avoid appending endlessly
    tbody.innerHTML = '';
    
    // Re-append rows in sorted order
    rows.forEach(row => {
      tbody.appendChild(row);
    });
    
    // Reattach the footer row after sorting if it exists
    if (tfoot) {
      table.appendChild(tfoot);
    }
    
    // Update sorting info
    tableSortInfo['killsTable'].lastSortedColumnIndex = 0;
    tableSortInfo['killsTable'].sortOrder = 'desc';
    
    // Reset to first page to show the newest entries
    currentPage = 1;
    renderTable();
    
    console.log("Kills table sorting complete");
  } catch (error) {
    console.error("Error sorting kills table:", error);
  } finally {
    isSorting = false;
  }
}

/**
 * Generic table sorting function (used for all tables except kills table)
 */
function sortTable(tableId, columnIndex, keepExistingSortOrder = false) {
  // Skip if we're trying to sort the kills table - use sortKillsTable instead
  if (tableId === 'killsTable') {
    if (!isSorting) {
      sortKillsTable();
    }
    return;
  }
  
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tfoot = table.tFoot;
  const rows = Array.from(table.rows).slice(1).filter((row) => row.parentNode.tagName !== "TFOOT");

  let sortOrder = table.dataset.sortOrder === "asc" ? "desc" : "asc";
  
  // If keepExistingSortOrder is true, don't toggle the sortOrder
  if (keepExistingSortOrder) {
    sortOrder = table.dataset.sortOrder || 'desc';
  } else {
    table.dataset.sortOrder = sortOrder;
  }
  
  rows.sort((a, b) => {
    const aValue = a.cells[columnIndex].textContent.trim();
    const bValue = b.cells[columnIndex].textContent.trim();

    if (!isNaN(parseFloat(aValue.replace(/,/g, ''))) && !isNaN(parseFloat(bValue.replace(/,/g, '')))) {
      return sortOrder === "asc" ?
        parseFloat(aValue.replace(/,/g, '')) - parseFloat(bValue.replace(/,/g, '')) :
        parseFloat(bValue.replace(/,/g, '')) - parseFloat(aValue.replace(/,/g, ''));
    } else {
      return sortOrder === "asc" ?
        aValue.localeCompare(bValue) :
        bValue.localeCompare(aValue);
    }
  });

  // Clear and repopulate to avoid any issues with duplicate rows
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
  }

  // Reattach the footer row after sorting
  if (tfoot) {
    table.appendChild(tfoot);
  }
  
  if (tableSortInfo[tableId]) {
    tableSortInfo[tableId].lastSortedColumnIndex = columnIndex;
    tableSortInfo[tableId].sortOrder = sortOrder;
  }
}

// ======================================================================
// UI INTERACTION FUNCTIONS
// ======================================================================

/**
 * Changes the font size for tables
 */
function changeFontSize(delta) {
  const tables = document.querySelectorAll('table');

  tables.forEach((table) => {
    const style = window.getComputedStyle(table);
    const fontSize = parseFloat(style.fontSize);
    table.style.fontSize = (fontSize + delta) + 'px';
  });
}

/**
 * Toggle speech synthesis on/off
 */
function toggleSpeech() {
  if (document.getElementById("speechSetting").checked) {
    enable_speech = true;
    speakText('Speech enabled');
  } else {
    speakText('Speech disabled');
    enable_speech = false;
  }
}

/**
 * Clear all data from the tables and storage
 */
function clearAllData() {
  // Clear the data from the localStorage
  localStorage.removeItem("killTracker");
  
  // Clear the data from the killDataList variable
  killDataList = [];
  
  // Clear the session merits
  resetSessionMerits()

  // Clear all UI elements
  clearAllTables();
  
  console.log("All data cleared");
}

/**
 * Clear all tables and data structures but don't clear localStorage
 */
function clearAllTables() {
  // Clear the table contents
  clearTableData("factionBounties");
  clearTableData("shipTypeBounties");
  clearTableData("killsTable");
  clearTableData("eventTypeBounties");
  clearTableData("powerPlayMerits");

   // Reset PowerPlay status variables
   currentPower = null;
   totalMerits = 0;
   sessionMerits = 0;

  // Hide the power status display
  const powerStatusElement = document.getElementById('powerStatus');
  if (powerStatusElement) {
    powerStatusElement.style.display = 'none';
  }
  
  // Clear the grid
  const gridContainer = document.getElementById('shipTypeBountiesGrid');
  if (gridContainer) {
    gridContainer.innerHTML = '';
  }
  
  // Clear targeted ships
  targeted_ships = [];
  const shipsTargettedTable = document.getElementById("ShipsTargettedTable");
  if (shipsTargettedTable) {
    const tbody = shipsTargettedTable.getElementsByTagName("tbody")[0];
    if (tbody) {
      tbody.innerHTML = '';
    }
  }

  // Refresh Updated Tables
  updateSummaryTables({});
  updatePowerPlayTable({});

    

}

/**
 * Clear all data from a specific table
 */
function clearTableData(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = '';
  }
  
  // Remove footer if it exists
  if (table.tFoot) {
    table.removeChild(table.tFoot);
  }
}

/**
 * Clear all targeted ships
 */
function WipeShipTargettedTable() {
  targeted_ships = [];
  RenderShipsTargettedTable();
}

/**
 * Cycle through different sort modes for the ship grid
 */
function cycleGridSortMode() {
  if (sortMode === 'shipType') {
    sortMode = 'kills';
  } else if (sortMode === 'kills') {
    sortMode = 'bounty';
  } else {
    sortMode = 'shipType';
  }
  updateShipTypeBountiesGrid();
}

/**
 * Switch between mobile and desktop layouts
 */
function switchLayout(layout) {
  if (layout === 'mobile') {
    // Switch to mobile layout
    document.getElementById('mobileLayout').style.display = 'block';
    document.getElementById('mobiletabs').style.display = 'block';
    document.getElementById('defaultLayout').style.display = 'none';
    
    // Move tables and grid to the mobile layout placeholders
    document.getElementById('killsTablePlaceholderMobile').appendChild(document.getElementById('killsTableWrapper'));
    document.getElementById('summaryTablesPlaceholderMobile').appendChild(document.getElementById('summaryTablesWrapper'));
    document.getElementById('gridPlaceholderMobile').appendChild(document.getElementById('gridWrapper'));
    openTab(null, 'killsTablePlaceholderMobile');
    
    // Update button states
    setActiveButton(mobileButton);
  } else {
    // Switch to desktop layout
    document.getElementById('mobileLayout').style.display = 'none';
    document.getElementById('mobiletabs').style.display = 'none';
    document.getElementById('defaultLayout').style.display = 'block';
    document.getElementById('pagePrefs').style.display = 'block';
    
    // Move tables and grid to the default layout placeholders
    document.getElementById('killsTablePlaceholder').appendChild(document.getElementById('killsTableWrapper'));
    document.getElementById('summaryTablesPlaceholder').appendChild(document.getElementById('summaryTablesWrapper'));
    document.getElementById('gridPlaceholder').appendChild(document.getElementById('gridWrapper'));
    
    // Update button states
    setActiveButton(desktopButton);
  }
}

/**
 * Set active state for the layout buttons
 */
function setActiveButton(button) {
  mobileButton.classList.remove("active");
  desktopButton.classList.remove("active");
  button.classList.add("active");
}

/**
 * Open a specific tab in mobile view
 */
function openTab(evt, tabName) {
  let tabContents = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].style.display = "none";
  }

  let tabLinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tabLinks.length; i++) {
    tabLinks[i].className = tabLinks[i].className.replace(" active", "");
  }

  document.getElementById(tabName).style.display = "block";
  
  if (evt) {
    evt.currentTarget.className += " active";
  }
}

// ======================================================================
// UTILITY FUNCTIONS
// ======================================================================

/**
 * Format text with proper sentence case
 */
function sentenceCase(str) {
  if ((str === null) || (str === ''))
    return false;
  
  str = str.toString();
  str = str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
  
  str = str.replace("Iv", "IV").replace("Iii", "III").replace("Ii", "II");
  return str;
}

/**
 * Text-to-speech function
 */
function speakText(text) {
  if (enable_speech === true) {
    // Check if the browser supports the Web Speech API
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      speech.lang = 'en-US';
      speech.rate = 1.5;
      speech.volume = 1;
      
      window.speechSynthesis.speak(speech);
    } else {
      console.log('Sorry, your browser does not support the Web Speech API.');
    }
  }
}

/**
 * Generate random speech based on event type and kill data
 */
function GenerateRandomSpeech(event, killData) {
  let shipname = "";
  shipname = killData.Ship || "";
  shipname = shipname.replace("Imperial ", " ");
  shipname = shipname.replace("Federal ", " ");
  shipname = shipname.replace("IV ", "");
  shipname = shipname.replace("III ", "");
  shipname = shipname.replace("II ", "");
  shipname = shipname.replace("MK ", "");

  let rank = killData.PilotRank || "";
  let textArray = [];

  // Add PowerplayMerits case
  if (event === 'PowerplayMerits') {
    const speech = GenerateRandomPowerplaySpeech(killData);
    // Return speech if it's not null, otherwise return empty string to avoid speech
    return speech || "";
  }
  else if (event === 'ShipTargetedSuperRich') {
    textArray = [
      'Spotted a high value ' + shipname,
      'Millionaire ' + shipname + ' targeted',
      'Kerching',
      'Target that ' + shipname + ', its worth it'
    ];
    
    // ... rest of the existing function ...
    
    if ((rank === 'Deadly') || (rank === 'Elite')) {
      if (shipname === 'Anaconda') {
        shipname = 'Conda';
      }
      
      textArray.push('Millionaire ' + rank + ' ' + shipname + ' spotted');
      textArray.push(rank + ' ' + shipname + ' needs a killin');
      textArray.push('Take out that ' + rank + ' ' + shipname);
      textArray.push(rank + ' ' + shipname + ' added to the victim list');
    }
  } else if (event === 'ShipTargeted') {
    textArray = [
      'Spotted a decent ' + shipname,
      'High value ' + shipname + ' targeted',
      'Heads up, ' + shipname + ' targeted',
      'Nice ' + shipname + ' you have there fella',
    ];
    
    if ((rank === 'Deadly') || (rank === 'Elite')) {
      if (shipname === 'Anaconda') { 
        shipname = 'Conda';
      }
      
      textArray.push('High value ' + rank + ' ' + shipname + ' up for grabs');
      textArray.push('Take out that ' + rank + ' ' + shipname);
      textArray.push(rank + ' ' + shipname + ' added to the queue');
    }
  } else if (event === 'KWS') {
    textArray = [
      'More people looking for that ' + shipname,
      shipname + ' bounty went up',
      'That ' + shipname + ' is wanted elsewhere too',
      shipname + ' worth more after that scan',
    ];
    
    if ((rank === 'Deadly') || (rank === 'Elite')) {
      if (shipname === 'Anaconda') { 
        shipname = 'Conda';
      }
      
      textArray.push('That ' + rank + ' ' + shipname + ' is wanted elsewhere too');
      textArray.push(rank + ' ' + shipname + ' is worth more after that scan');
      textArray.push(rank + ' ' + shipname + ' bounty went up');
      textArray.push('More people looking for that ' + rank + ' ' + shipname);
    }
  } else if (event === 'Kill') {
    textArray = [
      'Hope there was insurance on that ' + shipname,
      shipname + ' is toast',
      shipname + ' population minus one',
      shipname + ' exits the battle',
      'Stick another ' + shipname + ' sticker on the side',
      'Another ' + shipname + ' bites the dust'
    ];
    
    if ((rank === 'Deadly') || (rank === 'Elite')) {
      textArray.push(rank + ' used to mean something back in the day');
      textArray.push('They dont make ' + rank + ' pilots like they used to');
      textArray.push(rank + ' club just lost another member');
      textArray.push(rank + ' ' + shipname + ' bites the dust');
      textArray.push(rank + ' ' + shipname + ' population minus one');
      textArray.push(rank + ' ' + shipname + ' is toast');
      textArray.push('How did they become ' + rank + ' in the first place?');
      textArray.push('Bought that ' + rank + ' in anarchy system I guess?');
    }
  }
  
  // Select random speech line
  const randomNumber = Math.floor(Math.random() * textArray.length);
  return textArray[randomNumber];
}
/**
 * Card listener for mouse wheel zoom
 */
function addCardListener() {
  const cardContainer = document.getElementById("card-container");
  if (cardContainer) {
    cardContainer.addEventListener("wheel", (event) => {
      const currentFontSize = parseFloat(window.getComputedStyle(cardContainer).fontSize);
      let newFontSize;

      if (event.deltaY > 0) {
        // Scrolling down: decrease the font size
        newFontSize = Math.max(currentFontSize - 0.1, 0.5);
      } else {
        // Scrolling up: increase the font size
        newFontSize = Math.min(currentFontSize + 0.1, 2);
      }

      cardContainer.style.fontSize = newFontSize + "rem";
      event.preventDefault();
    });
  }
}

/**
 * Load ship data from JSON file
 */
function loadShipData() {
  // Fetch the JSON data from the file and store it in memory
  fetch('static/ship_data.json')
    .then(response => response.json())
    .then(data => {
      shipData = data;
      console.log('Ship data loaded:', shipData);
    })
    .catch(error => {
      console.error('Error fetching ship data:', error);
    });
}

/**
 * Get ship file name from ship ID
 */
function getShipFileNamefromShidId(shipId) {
  if (!shipData) return null;
  
  for (const key in shipData) {
    if (shipData[key].id === shipId) {
      return 'static/images/' + shipData[key].image_filename;
    }
  }
  return null;
}

/**
 * Get ship name from ship ID
 */
function getshipnamefromShidId(shipId) {
  if (!shipData) return 'Unknown: ' + shipId;
  
  for (const key in shipData) {
    if (shipData[key].id === shipId) {
      return shipData[key].name;
    }
  }
  return 'Not Found: ' + shipId;
}