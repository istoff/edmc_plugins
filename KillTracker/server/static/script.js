// Establish a connection to the server
const socket = io.connect('http://' + document.domain + ':' + location.port);
let sortMode = 'shipType';
let shipData = null;

const mobileButton = document.getElementById("mobileButton");
const desktopButton = document.getElementById("desktopButton");


function loadShipData() {
	// Fetch the JSON data from the file and store it in memory
	fetch('static/ship_data.json')
		.then(response => response.json())
		.then(data => {
			shipData = data;
			//console.log('Ship data loaded:', shipData);

			// You can call any functions that depend on shipData here
		})
		.catch(error => {
			console.error('Error fetching ship data:', error);
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

		killData.shipName = getGetShipNamefromShidId(killData.shipType);
		killData.shipImageFileName = getGetShipFileNamefromShidId(killData.shipType);
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
});



function generateRandomRow() {
	// Assuming shipData is already loaded and available
	const shipIds = Object.keys(shipData);

	// Select a random ship ID
	const randomShipId = shipIds[Math.floor(Math.random() * shipIds.length)];

	const eventTypes = ["Bounty", "PVPKill", "FactionKillBond"];
	const factions = ["Federation", "Empire", "Alliance", "Independent"];

	let randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
	let randomKillData;


	if ((randomEventType === 'Bounty') || (randomEventType === 'PVPKill')) {

		randomKillData = {
			timestamp: new Date().toISOString(),
			eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
			shipType: randomShipId,
			faction: factions[Math.floor(Math.random() * factions.length)],
			bountyAmount: Math.floor(Math.random() * 100000) + 1000,
			shipName: shipData[randomShipId].name,
			shipImageFileName: shipData[randomShipId].image_filename,
			victimFaction: ''
		}

	} else if (randomEventType === 'FactionKillBond') {
		randomKillData = {
			timestamp: new Date().toISOString(),
			eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
			shipType: '',
			faction: factions[Math.floor(Math.random() * factions.length)],
			bountyAmount: Math.floor(Math.random() * 100000) + 1000,
			shipName: '',
			shipImageFileName: '',
			victimFaction: factions[Math.floor(Math.random() * factions.length)]

		}
	}
	addKillTableRow(randomKillData);
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
	//console.log ('Retrieving ship image file name for ship name:', shipName);
	for (const key in shipData) {
		if (shipData[key].name === shipName) {
			return 'static/images/' + shipData[key].image_filename;
		}
	}
}

function getGetShipFileNamefromShidId(shipId) {
	//console.log('Retrieving ship image file name for ship ID:', shipId);

	for (const key in shipData) {
		if (shipData[key].id === shipId) {
			return 'static/images/' + shipData[key].image_filename;
		}
	}
	//console.log('Ship ID not found:', shipId)
	return null;
}

function getGetShipNamefromShidId(shipId) {
	//console.log('Retrieving ship name for ship ID:', shipId);
	for (const key in shipData) {
		if (shipData[key].id === shipId) {
			return shipData[key].name;
		}
	}
	//console.log('Ship ID not found:', shipId)
	return 'Not Found: ' + shipId;
}

function addKillTableRow(rowData) {
	// Get the kills table body
	let killsTableBody = document.getElementById("killsTable").getElementsByTagName("tbody")[0];


	// Create a new row and cells
	let newRow = killsTableBody.insertRow(-1);
	let cell1 = newRow.insertCell(0);
	let cell2 = newRow.insertCell(1);
	let cell3 = newRow.insertCell(2);
	let cell4 = newRow.insertCell(3);
	let cell5 = newRow.insertCell(4);
	let cell6 = newRow.insertCell(4);

	// Add the row data to the cells
	cell1.innerHTML = rowData.timestamp;
	cell2.innerHTML = rowData.shipName;
	//cell3.innerHTML = rowData.faction;
	//let factionCell = row.insertCell(3);
	//let rewardsText = rowData.Rewards.map(reward => `${reward.Faction}: ${reward.Reward.toLocaleString()}`).join(', ');

	if ( rowData.eventType === 'FactionKillBond') {
		cell3.textContent = rowData.AwardingFaction;

	} else {

	     if (rowData.Rewards.length !== 0)  {
		   let rewardsText = rowData.Rewards.map(reward => `${reward.Faction}: ${reward.Reward}`).join(', ');
		   cell3.textContent = rewardsText;
	    }
    }
	cell4.innerHTML = rowData.eventType;
	cell5.innerHTML = rowData.bountyAmount;
	cell6.innerHTML = rowData.VictimFaction;


	// Scroll the kills table to the bottom
	let killsTableWrapper = document.getElementById("killsTableWrapper");
	killsTableWrapper.scrollTop = killsTableWrapper.scrollHeight;

	//
	updateSummaryTables(rowData);
	renderTable();
}

function updateSummaryTables(rowData) {
	//updateNestedTable('factionBounties', kill_data.faction, kill_data.bountyAmount);
	if ( rowData.eventType === 'FactionKillBond') {
		updateNestedTable('factionBounties', rowData.AwardingFaction, rowData.bountyAmount);

	} else {

	if ((rowData.Rewards.length !== 0) && (rowData.eventType !== 'FactionKillBond')) {

		for (const reward of rowData.Rewards) {
			updateNestedTable('factionBounties', reward.Faction, reward.Reward);
		}
	}
}
	// only update NestedTable if the shipName is not empty
	if (rowData.shipName != '') {
		updateNestedTable('shipTypeBounties', rowData.shipName, rowData.bountyAmount);
	}
	updateNestedTable('eventTypeBounties', rowData.eventType, rowData.bountyAmount);
	loadShipData(); // TODO remove this loader
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
	footerTotalBountyCell.innerText = totalBounty;
	footerTotalCell.innerText = totalKills;
	footerTotalBountyCell.style.textAlign = "right";
	footerTotalCell.style.textAlign = "right";

	// Apply the footer-row class to all cells in the footer row
	footerRow.cells[0].classList.add("footer-row");
	footerTotalBountyCell.classList.add("footer-row");
	footerTotalCell.classList.add("footer-row");
}


function sortTable(tableId, columnIndex) {
	const table = document.getElementById(tableId);
	const tfoot = table.tFoot;
	const rows = Array.from(table.rows).slice(1).filter((row) => row.parentNode.tagName !== "TFOOT"); // Exclude the header row and footer row

	let sortOrder = table.dataset.sortOrder === "asc" ? "desc" : "asc";
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
}


/* function sortTable(tableId, columnIndex) {
	let table = document.getElementById(tableId);
	let rows = Array.from(table.rows);

	// Remove the header and footer rows
	let header = rows.shift();
	let footer = rows.pop();

	// Sort the remaining rows based on the selected column
	rows.sort((a, b) => {
		let aValue = a.cells[columnIndex].innerText;
		let bValue = b.cells[columnIndex].innerText;

		if (!isNaN(aValue) && !isNaN(bValue)) {
			return parseInt(aValue) - parseInt(bValue);
		} else {
			return aValue.localeCompare(bValue);
		}
	});

	// Rebuild the table with the sorted rows
	table.innerHTML = '';
	table.appendChild(header);
	for (let row of rows) {
		table.appendChild(row);
	}
	table.appendChild(footer);
} */




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
			shipFileName: getShipFileNameFromShipName(row.cells[0].innerText),
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
		card.className = "card";

		// Create a new card image
		const cardImage = document.createElement("div");
		cardImage.className = "card-image";

		const image = document.createElement("img");
		image.src = item.shipFileName;
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
	evt.currentTarget.className += " active";
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



// Add event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
	// Trigger the default tab to be open initially
	// document.querySelector('.tablinks').click();
	// Call the function to load the ship data
	loadShipData();

	// Set the initial active button
	setActiveButton(desktopButton);

})