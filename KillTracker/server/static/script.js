// Establish a connection to the server
const socket = io.connect('http://' + document.domain + ':' + location.port);
let sortMode = 'shipType';
let shipData = null;
let killDataList = [];

loadShipData();

const mobileButton = document.getElementById("mobileButton");
const desktopButton = document.getElementById("desktopButton");

function saveData(key, data) {
	console.log('Saving killDataList:', killDataList); // Add this line to log the killDataList
	jsonSaveData =  JSON.stringify(killDataList);
	debugger;
	localStorage.setItem('killTracker', jsonSaveData);
  }
  

  window.addEventListener('beforeunload', () => {
	console.log('killDataList before saving:', killDataList); // Add this line
	saveData('killTracker', killDataList);
  });
	


function loadShipData() {
	// Fetch the JSON data from the file and store it in memory
	fetch('static/ship_data.json')
		.then(response => response.json())
		.then(data => {
			shipData = data;
			console.log('Ship data loaded:', shipData);

			// You can call any functions that depend on shipData here

		})
		.catch(error => {
			console.error('Error fetching ship data:', error);
		});
}




function addCardListener()
{
	cardContainer = document.getElementById("card-container");
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



socket.on('connect', () => {
	console.log('Connected to the server.');
});

socket.on('disconnect', () => {
	console.log('Disconnected from the server.');
});

socket.on('new_kill', (killData) => {
	if ((killData.eventType === 'Bounty') || (killData.eventType === 'PVPKill')) {

		killData.shipName = getShipNamefromShidId(killData.shipType);
		//killData.shipImageFileName = getShipFileNamefromShidId(killData.shipType);
	} else if (killData.eventType === 'FactionKillBond') {
		killData.shipName = '';
		killData.shipType = ''
		killData.shipImageFileName = '';
	}
	console.log('New kill data received:', killData);

	const label = document.getElementById('status');
	label.textContent = `Cmdr ${killData.Cmdr}: ${killData.System} ${killData.Station}`;

	//label.textAlign = textAlign.end
	addKillTableRow(killData);
	//killDataList.push(killData);
	//updateSummaryTables(killData);
	// Reapply the sorting based on the last sorted column index and sortOrder for each table
Object.keys(tableSortInfo).forEach(tableId => {
  const { lastSortedColumnIndex } = tableSortInfo[tableId];
  sortTable(tableId, lastSortedColumnIndex, true);
});
});



function generateRandomRow() {
	// Assuming shipData is already loaded and available
	const shipIds = Object.keys(shipData);

	// Select a random ship ID
	const randomShipId = shipIds[Math.floor(Math.random() * shipIds.length)];

	const eventTypes = ["Bounty",  "FactionKillBond"];
	const factions = ["Federation", "Empire", "Alliance", "Independent"];

	let randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
	let randomKillData;


	if ((randomEventType === 'Bounty') || (randomEventType === 'PVPKill')) {

		randomKillData = {
			timestamp: new Date().toISOString(),
			eventType: randomEventType,
			shipType: randomShipId,
			faction: factions[Math.floor(Math.random() * factions.length)],
			bountyAmount: Math.floor(Math.random() * 100000) + 1000,
			shipName: shipData[randomShipId].name,
			shipImageFileName: shipData[randomShipId].image_filename,
			victimFaction: factions[Math.floor(Math.random() * factions.length)],
			AwardingFaction: factions[Math.floor(Math.random() * factions.length)],
			Rewards : [{'Faction': 'NULL', 'Reward': 399880}, {'Faction': 'Community of the Vault', 'Reward': 337909}]
			
		}

	} else if (randomEventType === 'FactionKillBond') {
		randomKillData = {
			timestamp: new Date().toISOString(),
			eventType: randomEventType,
			shipType: '',
			faction: factions[Math.floor(Math.random() * factions.length)],
			bountyAmount: Math.floor(Math.random() * 100000) + 1000,
			shipName: '',
			shipImageFileName: '',
			VictimFaction: factions[Math.floor(Math.random() * factions.length)],
			AwardingFaction: factions[Math.floor(Math.random() * factions.length)],

		}
	}
	addKillTableRow(randomKillData);
// Reapply the sorting based on the last sorted column index and sortOrder for each table
Object.keys(tableSortInfo).forEach(tableId => {
  const { lastSortedColumnIndex } = tableSortInfo[tableId];
  sortTable(tableId, lastSortedColumnIndex, true);	
  });

}

let currentPage = 1;
let rowsPerPage = 10;

function renderTable() {
	const table = document.getElementById('killsTable');
	const allRows = table.querySelectorAll('tr:not(.header)');
	const totalPages = Math.ceil(allRows.length / rowsPerPage);

	// Hide all rows
	allRows.forEach(row => row.style.display = 'none');

	// Display the rows for the current page
	for (let i = (currentPage - 1) * rowsPerPage; i < currentPage * rowsPerPage && i < allRows.length; i++) {
		allRows[i].style.display = '';
	}

	// Update the page navigation display
	document.getElementById('currentPage').innerText = currentPage;
	document.getElementById('totalPages').innerText = totalPages;
}


function previousPage() {
	if (currentPage > 1) {
		currentPage--;
		renderTable();
	}
}

function nextPage() {
	const table = document.getElementById('killsTable');
	const allRows = table.querySelectorAll('tr:not(.header)');
	const totalPages = Math.ceil(allRows.length / rowsPerPage);

	if (currentPage < totalPages) {
		currentPage++;
		renderTable();
	}
}

function updateRowsPerPage(newRowsPerPage) {
	rowsPerPage = parseInt(newRowsPerPage, 10);
	currentPage = 1;
	renderTable();
}


function getShipFileName(shipId) {
	for (const key in shipData) {
		if (shipData[key] === shipId) {
			return shipData[key].image_filename;
		}
	}
	return null;
}

function getShipName(shipId) {
	for (const key in shipData) {
		if (shipData[key] === shipId) {
			return shipData[key].name;
		}
	}
	return null;
}
		
function getShipFileNameFromShipName(shipName) {
	console.log ('Retrieving ship image file name for ship name:', shipName);
	for (const key in shipData) {
		if (shipData[key].name === shipName) {
			result =  'static/images/' + shipData[key].image_filename;
			return result;
		}
	}
}

function getShipFileNamefromShidId(shipId) {
	//console.log('Retrieving ship image file name for ship ID:', shipId);

	for (const key in shipData) {
		if (shipData[key].id === shipId) {
			return 'static/images/' + shipData[key].image_filename;
		}
	}
	//console.log('Ship ID not found:', shipId)
	return null;
}

function getShipNamefromShidId(shipId) {
	//console.log('Retrieving ship name for ship ID:', shipId);
	for (const key in shipData) {
		if (shipData[key].id === shipId) {
			return shipData[key].name;
		}
	}
	//console.log('Ship ID not found:', shipId)
	return 'Not Found: ' + shipId;
}

function addKillTableRow(killData) {
	// Get the kills table body
	let killsTableBody = document.getElementById("killsTable").getElementsByTagName("tbody")[0];


  // Add the killData to the killDataList array
    killDataList.push(killData);

	// Create a new row and cells
	let newRow = killsTableBody.insertRow(-1);
	let cell1 = newRow.insertCell(0);
	let cell2 = newRow.insertCell(1);
	let cell3 = newRow.insertCell(2);
	let cell4 = newRow.insertCell(3);
	let cell5 = newRow.insertCell(4);
	let cell6 = newRow.insertCell(4);

	// Add the row data to the cells
	cell1.innerHTML = killData.timestamp;
	cell2.innerHTML = killData.shipName;
	//cell3.innerHTML = rowData.faction;
	//let factionCell = row.insertCell(3);
	//let rewardsText = rowData.Rewards.map(reward => `${reward.Faction}: ${reward.Reward.toLocaleString()}`).join(', ');

	if ( killData.eventType === 'FactionKillBond') {
		cell3.textContent = killData.AwardingFaction;

	} else {

	     if (killData.Rewards.length !== 0)  {
		   let rewardsText = killData.Rewards.map(reward => `${reward.Faction}: ${reward.Reward}`).join(', ');
		   cell3.textContent = rewardsText;
	    }
    }
	cell4.innerHTML = killData.eventType;
	cell5.innerHTML = killData.bountyAmount;
	cell6.innerHTML = killData.VictimFaction;


	// Scroll the kills table to the bottom
	let killsTableWrapper = document.getElementById("killsTableWrapper");
	killsTableWrapper.scrollTop = killsTableWrapper.scrollHeight;

	//
	updateSummaryTables(killData);
	renderTable();
}

function updateSummaryTables(killData) {
	//updateNestedTable('factionBounties', kill_data.faction, kill_data.bountyAmount);
	if ( killData.eventType === 'FactionKillBond') {
		updateNestedTable('factionBounties', killData.AwardingFaction, killData.bountyAmount);

	} else {

	if ((killData.Rewards.length !== 0) && (killData.eventType !== 'FactionKillBond')) {

		for (const reward of killData.Rewards) {
			updateNestedTable('factionBounties', reward.Faction, reward.Reward);
		}
	}
}
	// only update NestedTable if the shipName is not empty
	if (killData.shipName != '') {
		updateNestedTable('shipTypeBounties', killData.shipName, killData.bountyAmount);
	}
	updateNestedTable('eventTypeBounties', killData.eventType, killData.bountyAmount);
	updateShipTypeBountiesGrid();
}

function updateNestedTable(tableId, key, value) {
	let table = document.getElementById(tableId);

	let row = table.rows.namedItem(key);

	// Remove existing footer row if it exists
	if (table.tFoot) {
		table.removeChild(table.tFoot);
	}

	if (!row) {
		row = table.insertRow(-1);
		row.id = key;

		let nameCell = row.insertCell(0);
		htmlText = key;
		nameCell.textContent = htmlText;

		let valueCell = row.insertCell(1);
		valueCell.style.textAlign = "right";
		valueCell.textContent = value;

		let countCell = row.insertCell(2);
		countCell.style.textAlign = "right";
		countCell.textContent = 1;
	} else {
		let currentValue = parseInt(row.cells[1].textContent.replace(/,/g, ''));
		let currentCount = parseInt(row.cells[2].textContent);
		row.cells[1].textContent = (currentValue + value);
		row.cells[2].textContent = currentCount + 1;
	}

	// Create and insert footer row
	const tfoot = table.createTFoot();
	const footerRow = tfoot.insertRow(-1);
	let totalKills = 0;
	let totalBounty = 0;

	for (let i = 1; i < table.rows.length - 1; i++) { // Skipping the header and footer rows
		totalBounty += parseInt(table.rows[i].cells[1].textContent.replace(/,/g, ''));
		totalKills += parseInt(table.rows[i].cells[2].textContent);
	}

	footerRow.insertCell(0).innerText = 'Total';
	const footerTotalBountyCell = footerRow.insertCell(1)
	const footerTotalCell = footerRow.insertCell(2)
	footerTotalBountyCell.innerText = totalBounty.toLocaleString();
	footerTotalCell.innerText = totalKills;
	footerTotalBountyCell.style.textAlign = "right";
	footerTotalCell.style.textAlign = "right";

	// Apply the footer-row class to all cells in the footer row
	footerRow.cells[0].classList.add("footer-row");
	footerTotalBountyCell.classList.add("footer-row");
	footerTotalCell.classList.add("footer-row");
}

const tableSortInfo = {
  'factionBounties': { lastSortedColumnIndex: 1, sortOrder: 'desc' },
  'shipTypeBounties': { lastSortedColumnIndex: 1, sortOrder: 'desc' },
  'eventTypeBounties': { lastSortedColumnIndex: 1, sortOrder: 'desc' },
};


function sortTable(tableId, columnIndex, keepExistingSortOrder = false) {
	const table = document.getElementById(tableId);
	const tfoot = table.tFoot;
	const rows = Array.from(table.rows).slice(1).filter((row) => row.parentNode.tagName !== "TFOOT"); // Exclude the header row and footer row

	let sortOrder = table.dataset.sortOrder === "asc" ? "desc" : "asc";
	
	  // If keepExistingSortOrder is true, don't toggle the sortOrder
  if (keepExistingSortOrder) {
    sortOrder = table.dataset.sortOrder;
  } else {
    table.dataset.sortOrder = sortOrder;
  }
	
	table.dataset.sortOrder = sortOrder;

	rows.sort((a, b) => {
		const aValue = a.cells[columnIndex].textContent.trim();
		const bValue = b.cells[columnIndex].textContent.trim();

		if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
			return sortOrder === "asc" ?
				parseFloat(aValue) - parseFloat(bValue) :
				parseFloat(bValue) - parseFloat(aValue);
		} else {
			return sortOrder === "asc" ?
				aValue.localeCompare(bValue) :
				bValue.localeCompare(aValue);
		}
	});

	for (const row of rows) {
		table.tBodies[0].appendChild(row);
	}

	// Reattach the footer row after sorting
	if (tfoot) {
		table.appendChild(tfoot);
	}
  tableSortInfo[tableId].lastSortedColumnIndex = columnIndex;
  tableSortInfo[tableId].sortOrder = sortOrder;

}

function updateKillData(killData) {
	// Update the kills table
	updateKillsTable(killData);

	// Update the summary tables
	updateSummaryTables(killData);

	// Update the ship type bounties grid
	updateShipTypeBountiesGrid(killData);

	// Switch to the currently selected layout
	const selectedLayout = document.getElementById('layoutSelect').value;
	switchLayout(selectedLayout);
}


function updateSummaryTable(summaryData) {
	let totalBounties = document.getElementById("totalBounties");
	let totalKills = document.getElementById("totalKills");

	totalBounties.innerHTML = summaryData.totalBounties;
	totalKills.innerHTML = summaryData.totalKills;
}



function updateKillsTable(killData) {

	addKillTableRow(randomKillData);

}

function BrokenupdateShipTypeBountiesGrid(killData) {
	// Check if the ship type is already in the grid
	let shipTypeFound = false;
	for (const item of shipTypeSummary) {
		if (item.shipType === killData.shipType) {
			shipTypeFound = true;
			item.bounty += killData.bounty;
			item.kills += 1;
			break;
		}
	}

	// If the ship type is not in the grid, add a new entry
	if (!shipTypeFound) {
		shipTypeSummary.push({
			shipType: killData.shipType,
			bounty: killData.bounty,
			kills: 1,
		});
	}

	// Sort the ship type summary data by descending bounty
	shipTypeSummary.sort((a, b) => b.bounty - a.bounty);

	// Clear the current grid content
	let shipTypeBountiesGrid = document.getElementById('shipTypeBountiesGrid');
	shipTypeBountiesGrid.innerHTML = '';

	// Create grid items based on the sorted data
	for (const item of shipTypeSummary) {
		let gridItem = document.createElement('div');
		gridItem.className = 'kill-grid-item';

	}
}

function updateShipTypeBountiesGrid() {
	const shipTypeBountiesTable = document.getElementById('shipTypeBounties');
	const shipTypeBountiesGrid = document.getElementById('shipTypeBountiesGrid');

	// Remove existing grid items
	while (shipTypeBountiesGrid.firstChild) {
		shipTypeBountiesGrid.removeChild(shipTypeBountiesGrid.firstChild);
	}

	// Get data from the shipTypeBounties table
	let data = [];
	for (let i = 1; i < shipTypeBountiesTable.rows.length - 1; i++) {
		const row = shipTypeBountiesTable.rows[i];
		data.push({
			shipType: row.cells[0].innerText,
			bounty: parseInt(row.cells[1].innerText, 10),
			kills: parseInt(row.cells[2].innerText, 10),
			shipFileName: row.cells[0].innerText,
			shipName: row.cells[0].innerText
		});
	}
    
	// Apply sorting based on the sortMode
	data.sort((a, b) => {
		switch (sortMode) {
			case 'shipType':
				return a.shipType.localeCompare(b.shipType);
			case 'kills':
				return b.kills - a.kills;
			case 'bounty':
				return b.bounty - a.bounty;
		}
	});

	// Create grid items based on the sorted data
	for (const item of data) {
		//console.log(item);
		const gridItem = document.createElement('div');

		//const snakeName = item.shipType.replace(/\s+/g, '-').toLowerCase();	     
		//const shipName = getShipName(item.shipType)
		//const shipFileName = getShipFileName(item.shipType)
		let bountyValue = item.bounty + ' credits';
		let numKills = item.kills + ' kill(s)'
		//console.log(item.shipName);

		//gridItem.appendChild(caption);

		//shipTypeBountiesGrid.appendChild(gridItem);

		// Get the grid element
		//const grid = document.getElementById("grid");

		// Create a new grid item
		//const gridItem = document.createElement("div");
		gridItem.className = "grid-item";

		// Create a new card
		const card = document.createElement("div");
		card.className = "cards";
		card.id = 'card-container'

		// Create a new card image
		const cardImage = document.createElement("div");
		cardImage.className = "card-image";

		const image = document.createElement("img");
		item.shipFilename = getShipFileNameFromShipName(item.shipFileName);
		image.src = item.shipFilename;
		image.alt = "Image";

		cardImage.appendChild(image);
		card.appendChild(cardImage);

		// Create a new card content
		const cardContent = document.createElement("div");
		cardContent.className = "card-content";

		const title = document.createElement("h3");
		title.className = "card-title";
		title.textContent = item.shipName;

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
		//grid.appendChild(gridItem);
		shipTypeBountiesGrid.appendChild(gridItem);
		addCardListener();
	}
}

document.getElementById('shipTypeBountiesGrid').addEventListener('click', () => {
	if (sortMode === 'shipType') {
		sortMode = 'kills';
	} else if (sortMode === 'kills') {
		sortMode = 'bounty';
	} else {
		sortMode = 'shipType';
	}
	updateShipTypeBountiesGrid();
});




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
	//evt.currentTarget.className += " active";
	if (tabName === 'killsTablePlaceholderMobile') {
		document.getElementById('pagePrefs').style.display = 'block';
	}
}



// Pagination variables
let killsTablePage = 1;
let killsTablePageSize = 10;

// Update the setPage function to use the killsTablePage and killsTablePageSize variables
function setPage(page) {
	if (page < 1) {
		return;
	}

	const start = (page - 1) * killsTablePageSize;
	const end = start + killsTablePageSize;

	if (start >= killData.length) {
		return;
	}

	killsTablePage = page;
	updateKillsTable(killData.slice(start, end));
}

function clearAllData() {
	// Clear the data from the localStorage
	localStorage.removeItem("killDataList");
  
	// Clear the data from the killDataList variable
	killDataList = [];
  
	// Clear the data from the tables
	// Replace "table1", "table2", "table3" with the actual IDs of your tables
	clearTableData("factionBounties");
	clearTableData("shipTypeBounties");
	clearTableData("killsTable");
	clearTableData("eventTypeBounties");
  // Clear the grid
  // Replace "gridContainer" with the actual ID of your grid container
  	//clearGrid("shipTypeBountiesGrid");
	// Check if the grid container exists
    const gridContainer = document.getElementById('shipTypeBountiesGrid');
    if (gridContainer) {
        gridContainer.innerHTML = '';
    }
}

  
  
  function clearTableData(tableId) {
	const table = document.getElementById(tableId);
	const tfoot = table.tFoot;
  
	// Remove all table rows except the header
	const rows = Array.from(table.rows);//.filter((row) => row.parentNode.tagName !== "TFOOT");
	for (let i = rows.length -1; i >= 1; i--) {
	  table.deleteRow(i);
	}
	
  }
  
  function clearGrid(gridContainerId) {
	const shipGrid = document.getElementById(gridContainerId);
	// if (shipGrid) exists, remove all grid Items
    
	// Remove all child elements from the grid container
	while (shipGrid.firstChild) {
		shipGrid.removeChild(shipGrid.firstChild);
	}


  }

function switchLayout(layout) {
	if (layout === 'mobile') {
		document.getElementById('mobileLayout').style.display = 'block';
		document.getElementById('mobiletabs').style.display = 'block';
		document.getElementById('defaultLayout').style.display = 'none';
		document.getElementById('pagePrefs').style.display = 'none';


		// Move tables and grid to the mobile layout placeholders
		document.getElementById('killsTablePlaceholderMobile').appendChild(document.getElementById('killsTableWrapper'));
		document.getElementById('summaryTablesPlaceholderMobile').appendChild(document.getElementById('summaryTablesWrapper'));
		document.getElementById('gridPlaceholderMobile').appendChild(document.getElementById('gridWrapper'));
		openTab(null, 'killsTablePlaceholderMobile');
	} else {
		document.getElementById('mobileLayout').style.display = 'none';
		document.getElementById('mobiletabs').style.display = 'none';
		document.getElementById('defaultLayout').style.display = 'block';
		document.getElementById('pagePrefs').style.display = 'block';
		// Move tables and grid to the default layout placeholders
		document.getElementById('killsTablePlaceholder').appendChild(document.getElementById('killsTableWrapper'));
		document.getElementById('summaryTablesPlaceholder').appendChild(document.getElementById('summaryTablesWrapper'));
		document.getElementById('gridPlaceholder').appendChild(document.getElementById('gridWrapper'));
	}
}

//document.getElementById('refresh-button').addEventListener('click', refreshTable);

document.getElementById('increaseFontSize').addEventListener('click', () => {
	changeFontSize(1);
});

document.getElementById('decreaseFontSize').addEventListener('click', () => {
	changeFontSize(-1);
});

document.getElementById("clearDataButton").addEventListener("click", clearAllData);


function changeFontSize(delta) {
	const tables = document.querySelectorAll('table');

	tables.forEach((table) => {
		const style = window.getComputedStyle(table);
		const fontSize = parseFloat(style.fontSize);
		table.style.fontSize = (fontSize + delta) + 'px';
	});
}

function setActiveButton(button) {
	mobileButton.classList.remove("active");
	desktopButton.classList.remove("active");
	button.classList.add("active");
}

mobileButton.addEventListener("click", () => {
	// Your existing mobileButton onclick code
	setActiveButton(mobileButton);
});

desktopButton.addEventListener("click", () => {
	// Your existing desktopButton onclick code
	setActiveButton(desktopButton);
});

function setActiveButton(button) {
	mobileButton.classList.remove("active");
	desktopButton.classList.remove("active");
	button.classList.add("active");
}



function loadData(key) {
	const data = localStorage.getItem(key);
	if (data) {
	  return JSON.parse(data);
	}
	return null;
  }

// Add event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
	// Trigger the default tab to be open initially
	// document.querySelector('.tablinks').click();
	// Call the function to load the ship data

	//fetchDataAndRenderImages;

	// Set the initial active button

		// Your code to be executed after waiting 100ms
	  setTimeout(() => {

	const savedData = loadData('killTracker');
	if (savedData.length !== 0) {
		SavedkillDataList = savedData;
		SavedkillDataList.forEach((killData) => {
		  addKillTableRow(killData);
		});	  

	}

}, 100);

	setActiveButton(desktopButton);

})