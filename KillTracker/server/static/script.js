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

let meritSourcesData = {
  'Trading': 0,
  'Bounty Hunting': 0,
  'Ground Combat': 0,
  'Fortification': 0,
  'Other': 0
};

// Power thumbnails mapping
const powerIcons = {
  'Edmund Mahon': 'alliance.png',
  'Felicia Winters': 'federation.png',
  'Zachary Hudson': 'federation.png',
  'Zemina Torval': 'empire.png',
  'Denton Patreus': 'empire.png',
  'Aisling Duval': 'empire.png',
  'Li Yong-Rui': 'independent.png',
  'Archon Delaine': 'independent.png',
  'Pranav Antal': 'independent.png',
  'Yuri Grom': 'independent.png'
};



let powerplayCommodities = [];
let powerPlayWidgetActive = true; // Track which view is currently shown


// Initialize global variables needed for the widget
window.currentPower = 'Unknown Power';
window.totalMerits = 0;
window.sessionMerits = 0;

// Add initialization on page load
document.addEventListener('DOMContentLoaded', function() {
  // Add after existing initialization code
  setTimeout(() => {
    console.log('Initializing PowerPlay widget toggle button');
    
    // Check for existing PowerPlay data in the page
    const powerStatusEl = document.getElementById('powerStatus');
    if (powerStatusEl && powerStatusEl.textContent) {
      // Try to extract current power from status if it exists
      const powerMatch = powerStatusEl.textContent.match(/([^:]+):/);
      if (powerMatch && powerMatch[1]) {
        window.currentPower = powerMatch[1].trim();
      }
    }
    
    console.log('Initialization complete with:', {
      power: window.currentPower,
      totalMerits: window.totalMerits,
      sessionMerits: window.sessionMerits
    });
  }, 500);
});


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
socket.on('powerplay_activity', function (data) {
  if (data.meritsGained >= 100) {
    // Only show significant merit gains
    data.description = getActivityDescription(data);
    addKillToTable(data, 'powerplay');
  }
});

socket.on('powerplay_cargo', function (data) {
  // Will be handled by the summary table
});

socket.on('powerplay_summary', function (data) {
  updatePowerplaySummary(data);
});


// Add a socket listener for shiplocker events
socket.on('shiplocker', function(data) {
  console.log('Received ShipLocker event:', data);
  if (data && data.powerplayCommodities) {
    updatePowerPlayCommodities(data.powerplayCommodities);
  }
});

// Add event listener for PowerplayMerits events
socket.on('powerplay_merits', function(data) {
  console.log('Received PowerplayMerits event:', data);
  handlePowerplayMeritsData(data);
});



window.togglePowerPlayView = function() {
  console.log('Toggle PowerPlay view called');
  const powerPlayTable = document.getElementById('powerPlayMerits');
  const powerPlayWidget = document.getElementById('powerPlayWidget');
  const toggleButton = document.getElementById('togglePowerPlayView');
  
  if (!powerPlayTable || !powerPlayWidget || !toggleButton) {
    console.error('Could not find required elements:',
      { table: !!powerPlayTable, widget: !!powerPlayWidget, button: !!toggleButton });
    return;
  }
  
  if (powerPlayWidgetActive) {
    console.log('Switching to table view');
    // Switch to table view
    powerPlayWidget.style.display = 'none';
    powerPlayTable.style.display = '';
    toggleButton.textContent = 'Switch to Widget View';
    powerPlayWidgetActive = false;
  } else {
    console.log('Switching to widget view');
    // Switch to widget view
    powerPlayTable.style.display = 'none';
    powerPlayWidget.style.display = '';
    toggleButton.textContent = 'Switch to Table View';
    powerPlayWidgetActive = true;
    
    // Update the widget with current data
    updatePowerPlayWidget();
  }
};


// New function specifically for handling PowerplayMerits events
function handlePowerplayMeritsData(data) {
  console.log('Handling PowerplayMerits data:', data);
  
  // Store the data in global variables
  window.currentPower = data.Power || data.power || 'Unknown Power';
  window.totalMerits = data.TotalMerits || data.totalMerits || 0;
  window.sessionMerits = data.sessionMerits || 0;
  
  // Update merit sources
  if (data.meritSources) {
    window.meritSourcesData = data.meritSources;
  } else if (data.meritSource) {
    // If only a single merit source is provided
    const source = data.meritSource;
    const meritsGained = data.MeritsGained || data.meritsGained || 0;
    
    if (window.meritSourcesData[source] !== undefined) {
      window.meritSourcesData[source] += meritsGained;
    } else {
      window.meritSourcesData['Other'] += meritsGained;
    }
  }
  
  // Update PowerPlay commodities if provided
  if (data.powerplayCommodities) {
    updatePowerPlayCommodities(data.powerplayCommodities);
  }
  
  // Update the status display
  const powerStatusElement = document.getElementById('powerStatus');
  if (powerStatusElement) {
    powerStatusElement.innerHTML = `<span class="power-name">${window.currentPower}</span>: <span class="merits-total">${window.totalMerits.toLocaleString()}</span> total merits (<span class="merits-session">+${window.sessionMerits.toLocaleString()}</span> this session)`;
    powerStatusElement.style.display = 'block';
  }
  
  // Call the original updatePowerPlayTable function
  updateNestedTable('powerPlayMerits', window.currentPower, window.totalMerits);
  
  // Update the widget if it's active
  if (powerPlayWidgetActive) {
    updatePowerPlayWidget();
  }
  
  console.log('PowerplayMerits data processed:', {
    power: window.currentPower,
    totalMerits: window.totalMerits,
    sessionMerits: window.sessionMerits,
    meritSources: window.meritSourcesData
  });
}

// Function to get the current rank merit threshold
function getCurrentRankThreshold(rank) {
  if (rank <= 1) return 0;
  if (rank === 2) return 2000;
  if (rank === 3) return 5000;
  if (rank === 4) return 9000;
  if (rank === 5) return 15000;
  
  // For ranks 6-99
  return 15000 + (rank - 5) * 8000;
}

// Function to get the next rank merit requirement
function getNextRankThreshold(rank) {
  if (rank === 100) return 775000; // Already at max rank
  
  if (rank === 1) return 2000;
  if (rank === 2) return 5000;
  if (rank === 3) return 9000;
  if (rank === 4) return 15000;
  if (rank === 5) return 23000;
  
  // For ranks 6-99
  return 15000 + (rank - 5 + 1) * 8000;
}


// Updated function to update the PowerPlay widget
function updatePowerPlayWidget() {
  console.log('Updating PowerPlay widget with:', {
    power: window.currentPower,
    totalMerits: window.totalMerits,
    sessionMerits: window.sessionMerits
  });
  
  // Update timestamp
  const timestampEl = document.getElementById('powerPlayWidgetTimestamp');
  if (timestampEl) {
    timestampEl.textContent = new Date().toLocaleString();
  }
  
  // Update power name, icon and rating
  const powerNameEl = document.getElementById('powerPlayWidgetPower');
  const powerIconEl = document.querySelector('.power-icon');
  const ratingEl = document.getElementById('powerPlayWidgetRating');
  
  if (powerNameEl) powerNameEl.textContent = window.currentPower || 'Unknown Power';
  
  // Set power icon based on the current power
  if (powerIconEl && window.currentPower) {
    const iconPath = powerIcons[window.currentPower] || 'unknown.png';
    powerIconEl.style.backgroundImage = `url(/static/images/powers/${iconPath})`;
    powerIconEl.style.backgroundSize = 'cover';
    powerIconEl.style.backgroundPosition = 'center';
  }
  
  // Calculate rating based on total merits using the correct thresholds
  const rank = calculatePowerPlayRank(window.totalMerits);
  
  if (ratingEl) ratingEl.textContent = `Rating ${rank}`;
  
  // Update merit counts
  const thisWeekEl = document.getElementById('powerPlayWidgetThisWeek');
  const totalEl = document.getElementById('powerPlayWidgetTotal');
  
  if (thisWeekEl) thisWeekEl.textContent = window.sessionMerits.toLocaleString();
  if (totalEl) totalEl.textContent = window.totalMerits.toLocaleString();
  
  // Update progress bar
  const progressBar = document.getElementById('powerPlayWidgetProgressBar');
  const progressCounter = document.getElementById('powerPlayWidgetProgressCounter');
  
  // Get the merit thresholds for current and next rank
  const currentRankThreshold = getCurrentRankThreshold(rank);
  const nextRankThreshold = getNextRankThreshold(rank);
  
  // Calculate how many more merits needed for next rank
  const meritsTillNextRank = nextRankThreshold - window.totalMerits;
  
  // Calculate progress percentage within the current rank
  let progress = 0;
  if (rank < 100) {
    const rankRange = nextRankThreshold - currentRankThreshold;
    const meritsSinceLastRank = window.totalMerits - currentRankThreshold;
    progress = Math.min((meritsSinceLastRank / rankRange) * 100, 100);
  } else {
    progress = 100; // 100% if at max rank
  }
  
  if (progressBar) progressBar.style.width = `${progress}%`;
  
  if (progressCounter) {
    if (rank < 100) {
      progressCounter.textContent = `${window.totalMerits.toLocaleString()} / ${nextRankThreshold.toLocaleString()} (Need ${meritsTillNextRank.toLocaleString()} more)`;
    } else {
      progressCounter.textContent = `${window.totalMerits.toLocaleString()} (Max Rank)`;
    }
  }
  
  // Update merit sources breakdown
  updateMeritSourceBreakdown();
  
  // Update inventory display
  updateInventoryDisplay();
}


function calculatePowerPlayRank(totalMerits) {
  // PowerPlay rank thresholds
  if (totalMerits >= 775000) return 100;
  if (totalMerits > 15000) {
    // For ranks 6-99, each rank needs 8000 more than the previous
    let rank = 5;
    let threshold = 15000;
    
    while (threshold + 8000 <= totalMerits && rank < 99) {
      rank++;
      threshold += 8000;
    }
    
    return rank;
  }
  if (totalMerits > 9000) return 4;
  if (totalMerits > 5000) return 3;
  if (totalMerits > 2000) return 2;
  return 1;
}

// Function to get the current rank merit threshold
function getCurrentRankThreshold(rank) {
  if (rank <= 1) return 0;
  if (rank === 2) return 2000;
  if (rank === 3) return 5000;
  if (rank === 4) return 9000;
  if (rank === 5) return 15000;
  
  // For ranks 6-99
  return 15000 + (rank - 5) * 8000;
}

// Function to get the next rank merit requirement
function getNextRankThreshold(rank) {
  if (rank === 100) return 775000; // Already at max rank
  
  if (rank === 1) return 2000;
  if (rank === 2) return 5000;
  if (rank === 3) return 9000;
  if (rank === 4) return 15000;
  if (rank === 5) return 23000;
  
  // For ranks 6-99
  return 15000 + (rank - 5 + 1) * 8000;
}

// Function to update merit source breakdowns
function updateMeritSourceBreakdown() {

  // Ensure we have merit sources data
  if (!window.meritSourcesData) {
    window.meritSourcesData = {
      'Trading': 0,
      'Bounty Hunting': 0,
      'Ground Combat': 0,
      'Fortification': 0,
      'Other': 0
    };
  }

  // Calculate total merits for percentages
  const totalSessionMerits = Object.values(meritSourcesData).reduce((sum, value) => sum + value, 0) || 1;
  
  // Update each activity bar
  for (const [source, merits] of Object.entries(meritSourcesData)) {
    const percent = (merits / totalSessionMerits) * 100;
    const barElement = document.getElementById(`powerPlayWidget${source.replace(/\s+/g, '')}Bar`);
    const valueElement = document.getElementById(`powerPlayWidget${source.replace(/\s+/g, '')}Value`);
    
    if (barElement) barElement.style.width = `${percent}%`;
    if (valueElement) valueElement.textContent = merits.toLocaleString();
  }
}




function getActivityDescription(data) {
  switch (data.activityType) {
    case 'space_combat': return 'Space Combat';
    case 'ground_combat': return 'Ground Combat';
    case 'ship_scanned': return 'Ship Scanned';
    case 'cargo_sold':
      return `Cargo Sold: ${data.commodity} (${data.tons} tons)`;
    default: return 'Other Activity';
  }
}

// Function to update PowerPlay commodities
function updatePowerPlayCommodities(commodities) {
  // Handle undefined or null commodities
  if (!commodities) {
    console.log('Received invalid powerplayCommodities data (undefined or null)');
    commodities = [];
  }
  
  // Handle non-array commodities
  if (!Array.isArray(commodities)) {
    console.log('Received non-array powerplayCommodities data:', commodities);
    commodities = [];
  }
  
  // Update the global variable
  powerplayCommodities = commodities;
  
  // Update the widget display if it's active
  if (powerPlayWidgetActive) {
    updateInventoryDisplay();
  }
}

// Function to update the inventory display
function updateInventoryDisplay() {
  const inventoryList = document.getElementById('powerPlayWidgetInventory');
  if (!inventoryList) return;
  
  // Clear existing inventory items
  inventoryList.innerHTML = '';
  
  // Add each commodity to the inventory list
  if (!powerplayCommodities || powerplayCommodities.length === 0) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'inventory-item';
    emptyItem.innerHTML = '<span class="item-name">No commodities found</span><span class="item-qty">0</span>';
    inventoryList.appendChild(emptyItem);
  } else {
    powerplayCommodities.forEach(commodity => {
      const item = document.createElement('div');
      item.className = 'inventory-item';
      item.innerHTML = `<span class="item-name">${commodity.name}</span><span class="item-qty">${commodity.count}</span>`;
      inventoryList.appendChild(item);
    });
  }
}

function updatePowerplaySummary(data) {
  const summaryTable = document.getElementById('powerplay-summary');
  // Clear existing rows
  while (summaryTable.rows.length > 1) {
    summaryTable.deleteRow(1);
  }

  // Add cargo sales
  for (const [commodity, details] of Object.entries(data.activities.cargo_sold)) {
    const row = summaryTable.insertRow();
    row.insertCell(0).textContent = 'Cargo Sold';
    row.insertCell(1).textContent = commodity;
    row.insertCell(2).textContent = details.tons;
    row.insertCell(3).textContent = details.merits;
  }

  // Add other activities
  for (const [activity, merits] of Object.entries(data.activities)) {
    if (activity !== 'cargo_sold' && merits > 0) {
      const row = summaryTable.insertRow();
      row.insertCell(0).textContent = activity.split('_').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      row.insertCell(1).textContent = '';
      row.insertCell(2).textContent = '';
      row.insertCell(3).textContent = merits;
    }
  }

  // Add totals
  const totalRow = summaryTable.insertRow();
  totalRow.insertCell(0).textContent = 'Total Session';
  totalRow.insertCell(1).textContent = '';
  totalRow.insertCell(2).textContent = '';
  totalRow.insertCell(3).textContent = data.session_merits;
}
socket.on('powerplay_commodities', function (data) {
  console.log('Received PowerplayCommodities event:', data);
  updatePowerPlayCommodities(data);
});
socket.on('new_kill', handleNewKillData);
socket.on('new_test', handleTestData);

// Make sure to add event handlers to initialize the widget on page load
document.addEventListener('DOMContentLoaded', function () {
  // Add after existing initialization code
  setTimeout(() => {
    if (currentPower) {
      createPowerPlayWidget();
      updateMeritSourcesVisualization();
    }
  }, 300);
});


// DOM loaded event to initialize the UI
document.addEventListener('DOMContentLoaded', function () {
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

// Update the updatePowerStatus function to trigger widget updates
function updatePowerStatus(powerData) {
  if (!powerData || !powerData.Power) return;
  
  // Update the current power and merit counts
  currentPower = powerData.Power;
  totalMerits = powerData.totalMerits || powerData.TotalMerits || 0;
  
  // Add to session merits
  const meritsGained = powerData.meritsGained || powerData.MeritsGained || 0;
  sessionMerits = powerData.sessionMerits || sessionMerits + meritsGained;
  
  // Update merit sources if provided
  if (powerData.meritSources) {
    meritSourcesData = powerData.meritSources;
  } else if (powerData.meritSource) {
    // If only a single merit source is provided, add it to the appropriate category
    const source = powerData.meritSource;
    if (meritSourcesData[source] !== undefined) {
      meritSourcesData[source] += meritsGained;
    } else {
      meritSourcesData['Other'] += meritsGained;
    }
  }
  
  // Update PowerPlay commodities if provided
  if (powerData.powerplayCommodities) {
    updatePowerPlayCommodities(powerData.powerplayCommodities);
  }
  
  // Update the status display
  const powerStatusElement = document.getElementById('powerStatus');
  if (powerStatusElement) {
    powerStatusElement.innerHTML = `<span class="power-name">${currentPower}</span>: <span class="merits-total">${totalMerits.toLocaleString()}</span> total merits (<span class="merits-session">+${sessionMerits.toLocaleString()}</span> this session)`;
    powerStatusElement.style.display = 'block';
  }
  
  // Update the widget if it's currently active
  if (powerPlayWidgetActive) {
    updatePowerPlayWidget();
  }
}



// Add a new function to update the merit sources visualization
function updateMeritSourcesVisualization() {
  const powerPlayWidget = document.getElementById('powerPlayWidget');
  if (!powerPlayWidget) return;

  // Update power and merit totals in widget
  const powerNameElement = document.getElementById('powerPlayWidgetPower');
  const ratingElement = document.getElementById('powerPlayWidgetRating');
  const thisWeekElement = document.getElementById('powerPlayWidgetThisWeek');
  const totalMeritsElement = document.getElementById('powerPlayWidgetTotal');

  if (powerNameElement) powerNameElement.textContent = currentPower || 'Unknown Power';

  // Calculate rating based on total merits
  let rating = 1;
  if (totalMerits >= 10000) rating = 5;
  else if (totalMerits >= 1500) rating = 4;
  else if (totalMerits >= 750) rating = 3;
  else if (totalMerits >= 100) rating = 2;

  if (ratingElement) ratingElement.textContent = `Rating ${rating}`;
  if (thisWeekElement) thisWeekElement.textContent = sessionMerits.toLocaleString();
  if (totalMeritsElement) totalMeritsElement.textContent = totalMerits.toLocaleString();

  // Update progress bar
  const progressBar = document.getElementById('powerPlayWidgetProgressBar');
  const progressCounter = document.getElementById('powerPlayWidgetProgressCounter');

  let nextRatingMerits = 100;
  if (rating === 1) nextRatingMerits = 100;
  else if (rating === 2) nextRatingMerits = 750;
  else if (rating === 3) nextRatingMerits = 1500;
  else if (rating === 4) nextRatingMerits = 10000;
  else nextRatingMerits = 10000;

  const progress = Math.min((sessionMerits / nextRatingMerits) * 100, 100);

  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressCounter) progressCounter.textContent = `${sessionMerits} / ${nextRatingMerits}`;

  // Update merit sources breakdown
  updateMeritSourceBreakdown();
}

// Add function to update the merit source breakdown
function updateMeritSourceBreakdown() {
  // Calculate total merits for percentages
  const totalSessionMerits = Object.values(meritSourcesData).reduce((sum, value) => sum + value, 0) || 1;

  // Update each activity bar
  for (const [source, merits] of Object.entries(meritSourcesData)) {
    const percent = (merits / totalSessionMerits) * 100;
    const barElement = document.getElementById(`powerPlayWidget${source.replace(/\s+/g, '')}Bar`);
    const valueElement = document.getElementById(`powerPlayWidget${source.replace(/\s+/g, '')}Value`);

    if (barElement) barElement.style.width = `${percent}%`;
    if (valueElement) valueElement.textContent = merits.toLocaleString();
  }
}



function resetSessionMerits() {
  sessionMerits = 0;
  
  // Reset merit sources
  for (const source in meritSourcesData) {
    meritSourcesData[source] = 0;
  }
  
  // Don't reset commodities since they are persistent inventory
  
  const powerStatusElement = document.getElementById('powerStatus');
  if (powerStatusElement && currentPower) {
    powerStatusElement.innerHTML = `<span class="power-name">${currentPower}</span>: <span class="merits-total">${totalMerits.toLocaleString()}</span> total merits (<span class="merits-session">+${sessionMerits.toLocaleString()}</span> this session)`;
  } else if (powerStatusElement) {
    powerStatusElement.style.display = 'none';
  }
  
  // Update the visualization
  updateMeritSourcesVisualization();
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
  switch (tier) {
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
    killData.shipImageFileName = killData.shipname.replace(/-/gi, "",).replace(/ /gi, "-");

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
function updatePowerPlayCommodities(commodityData) {
  const meritsTable = document.getElementById('powerPlayMerits');
  const commoditiesTable = document.getElementById('powerPlayCommodities');

  // Clear existing rows
  while (meritsTable.rows.length > 1) {
    meritsTable.deleteRow(1);
  }
  while (commoditiesTable.rows.length > 1) {
    commoditiesTable.deleteRow(1);
  }

  // Add activities data
  for (const [activity, details] of Object.entries(commodityData.activities)) {
    if (activity === 'cargo_sold') continue; // Handle cargo separately

    const row = activitiesTable.insertRow();
    row.insertCell(0).textContent = activity.split('_').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    row.insertCell(1).textContent = details;
    row.insertCell(2).textContent = ''; // Events count would need to be tracked
  }

  // Add cargo sold activities
  for (const [commodity, details] of Object.entries(commodityData.activities.cargo_sold)) {
    const row = activitiesTable.insertRow();
    row.insertCell(0).textContent = `Trading ${commodity}`;
    row.insertCell(1).textContent = details.merits;
    row.insertCell(2).textContent = details.tons;
  }

  summarySection.appendChild(activitiesTable);
  container.appendChild(summarySection);

  // Create commodities section
  const commoditiesSection = document.createElement('div');
  commoditiesSection.className = 'powerplay-section';

  // Add header
  const commHeader = document.createElement('h3');
  commHeader.textContent = 'Commodity Inventory';
  commoditiesSection.appendChild(commHeader);

  // Add commodities table
  const commTable = document.createElement('table');
  commTable.className = 'powerplay-table';

  // Add table headers
  const commHeaderRow = commTable.insertRow();
  commHeaderRow.insertCell(0).textContent = 'Commodity';
  commHeaderRow.insertCell(1).textContent = 'Qty';
  commHeaderRow.insertCell(2).textContent = 'Projected Value';

  // Add commodities data
  const categories = ['Items', 'Components', 'Consumables', 'Data'];
  categories.forEach(category => {
    if (commodityData[category] && commodityData[category].length > 0) {
      commodityData[category].forEach(item => {
        const row = commTable.insertRow();
        row.insertCell(0).textContent = item.Name;
        row.insertCell(1).textContent = item.Count;

        // Calculate projected value (placeholder - would need actual merit values)
        const projectedValue = item.Count * 30; // Example 30 merits per unit
        row.insertCell(2).textContent = projectedValue;
      });
    }
  });

  commoditiesSection.appendChild(commTable);
  container.appendChild(commoditiesSection);

  // Add totals section
  const totalsSection = document.createElement('div');
  totalsSection.className = 'powerplay-totals';

  totalsSection.innerHTML = `
    <div>Total Merits Earned: ${commodityData.session_merits || 0}</div>
    <div>Total Merits In Inventory: ${commodityData.total_merits || 0}</div>
  `;

  container.appendChild(totalsSection);
}

// Replace the updatePowerPlayTable function
function updatePowerPlayTable(killData) {
  // Just call the standard table update function first
  updateNestedTable('powerPlayMerits', killData.Power, killData.totalMerits);
  
  // Then update our power status which will update the widget if active
  updatePowerStatus(killData);
}

// Add initialization on page load
document.addEventListener('DOMContentLoaded', function() {
  // Add after existing initialization code
  setTimeout(() => {
    // Set up toggle button
    const toggleButton = document.getElementById('togglePowerPlayView');
    if (toggleButton) {
      toggleButton.addEventListener('click', togglePowerPlayView);
    }
  }, 500);
});

// Add function to create the PowerPlay widget

// Modify the createPowerPlayWidget function to include the inventory section
function createPowerPlayWidget() {
  // Find the summary table container for PowerPlay Merits
  const summaryTable = document.querySelector('.summary-table:has(h3:contains("PowerPlay Merits"))');
  if (!summaryTable) return;
  
  // Create widget HTML
  const widgetHTML = `
    <div id="powerPlayWidget" class="powerplay-widget">
      <div class="widget-header">
        <div class="power-icon"></div>
        <div class="power-info">
          <h2 id="powerPlayWidgetPower" class="power-name">Unknown Power</h2>
          <div id="powerPlayWidgetRating" class="power-level">Rating 1</div>
        </div>
      </div>
      
      <div class="widget-content">
        <div class="merit-stats">
          <div class="merit-box">
            <div class="merit-label">MERITS THIS WEEK</div>
            <div id="powerPlayWidgetThisWeek" class="merit-value">0</div>
          </div>
          <div class="merit-box">
            <div class="merit-label">TOTAL MERITS</div>
            <div id="powerPlayWidgetTotal" class="merit-value">0</div>
          </div>
        </div>
        
        <div class="merit-breakdown">
          <div class="breakdown-title">MERIT SOURCES</div>
          <div class="breakdown-item">
            <div class="activity-label">Trading</div>
            <div class="activity-bar-container">
              <div id="powerPlayWidgetTradingBar" class="activity-bar trading" style="width: 0%"></div>
              <span id="powerPlayWidgetTradingValue" class="activity-value">0</span>
            </div>
          </div>
          <div class="breakdown-item">
            <div class="activity-label">Bounty Hunting</div>
            <div class="activity-bar-container">
              <div id="powerPlayWidgetBountyHuntingBar" class="activity-bar bounty" style="width: 0%"></div>
              <span id="powerPlayWidgetBountyHuntingValue" class="activity-value">0</span>
            </div>
          </div>
          <div class="breakdown-item">
            <div class="activity-label">Ground Combat</div>
            <div class="activity-bar-container">
              <div id="powerPlayWidgetGroundCombatBar" class="activity-bar combat" style="width: 0%"></div>
              <span id="powerPlayWidgetGroundCombatValue" class="activity-value">0</span>
            </div>
          </div>
          <div class="breakdown-item">
            <div class="activity-label">Fortification</div>
            <div class="activity-bar-container">
              <div id="powerPlayWidgetFortificationBar" class="activity-bar fortification" style="width: 0%"></div>
              <span id="powerPlayWidgetFortificationValue" class="activity-value">0</span>
            </div>
          </div>
          <div class="breakdown-item">
            <div class="activity-label">Other</div>
            <div class="activity-bar-container">
              <div id="powerPlayWidgetOtherBar" class="activity-bar other" style="width: 0%"></div>
              <span id="powerPlayWidgetOtherValue" class="activity-value">0</span>
            </div>
          </div>
        </div>
        
        <div class="progress-section">
          <div class="progress-header">
            <div class="progress-title">PROGRESS TO NEXT RATING</div>
            <div id="powerPlayWidgetProgressCounter" class="progress-counter">0 / 100</div>
          </div>
          <div class="progress-bar-outer">
            <div id="powerPlayWidgetProgressBar" class="progress-bar-inner" style="width: 0%"></div>
          </div>
        </div>
        
        <div class="inventory-section">
          <div class="inventory-title">MERIT COMMODITIES</div>
          <div id="powerPlayWidgetInventory" class="inventory-list">
            <div class="inventory-item">
              <span class="item-name">No commodities found</span>
              <span class="item-qty">0</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="widget-footer">
        Updated: ${new Date().toLocaleString()}
      </div>
    </div>
  `;
  
  // Replace the table with our widget
  summaryTable.innerHTML = `<h3>PowerPlay Merits</h3>${widgetHTML}`;
  
  // Initialize the widget with current data
  updateMeritSourcesVisualization();
  
  // Initialize the commodity section with any existing data
  if (powerplayCommodities.length > 0) {
    updatePowerPlayCommodities(powerplayCommodities);
  }
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
    "Mamba": "mamba",
    "Mandalay": "mandalay",
    "Type-8 Transporter": "type-8-transporter",
    "Python MkII": "python-mkii",
    "Commando": "commando",
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
    image.onerror = function () {
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
        { 'Faction': 'Federal Navy', 'Reward': Math.floor(Math.random() * 500000) },
        { 'Faction': 'Alliance Assembly', 'Reward': Math.floor(Math.random() * 300000) }
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

  // Clear all PowerPlay data
  currentPower = null;
  totalMerits = 0;
  sessionMerits = 0;
  resetSessionMerits();

  // Clear all UI elements
  clearAllTables();

  console.log("All data cleared including PowerPlay summary");
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

  // Clear PowerPlay table completely
  const powerPlayTable = document.getElementById('powerPlayMerits');
  if (powerPlayTable) {
    powerPlayTable.innerHTML = ''; // Clear entire table including footer
    // Recreate basic table structure
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Power</th>
        <th>Total Merits</th>
        <th>Events</th>
      </tr>
    `;
    powerPlayTable.appendChild(thead);
    powerPlayTable.appendChild(document.createElement('tbody'));
  }

  // Refresh Updated Tables
  updateSummaryTables({});



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
  str = str.replace(/\w\S*/g, function (txt) {
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
