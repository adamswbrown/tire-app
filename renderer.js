const { ipcRenderer } = require('electron');

let completedAppsList = [];

// Function to fetch completed apps from main process
async function fetchCompletedApps() {
    try {
        completedAppsList = await ipcRenderer.invoke('get-completed-apps');
        return completedAppsList;
    } catch (error) {
        console.error('Error fetching completed apps:', error);
        return [];
    }
}

// Event listener for the "Upload Excel File" button
document.getElementById('uploadBtn').addEventListener('click', async () => {
    console.log("File upload initiated.");
    const data = await ipcRenderer.invoke('upload-file'); // Use invoke for async response
    const statusMessage = document.getElementById('statusMessage');

    if (data.error) {
        statusMessage.textContent = `Error: ${data.error}`;
        console.error("Error uploading file:", data.error);
    } else {
        localStorage.setItem('appToServerData', JSON.stringify(data)); // Save valid data
        statusMessage.textContent = 'Upload complete! Data has been stored successfully.';
        await displayData(data); // Display data in the table
    }
});

// Add event listener for export button
document.getElementById('exportBtn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('export-completed-apps');
    const statusMessage = document.getElementById('statusMessage');
    
    if (result.success) {
        statusMessage.textContent = `Completed apps exported to: ${result.path}`;
        statusMessage.style.color = '#28a745';
    } else {
        statusMessage.textContent = `Error exporting apps: ${result.error}`;
        statusMessage.style.color = '#dc3545';
    }
});

// Function to display data in the table
async function displayData(data) {
    // Fetch latest completed apps
    await fetchCompletedApps();
    
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    let totalApps = 0;
    let inScope = 0;
    let outScope = 0;
    let completedApps = completedAppsList.length;

    const uniqueData = Array.from(new Map(
        data.filter(item => item['Application Name'] !== 'Unassociated')
            .map(item => [item['Application Name'], item])
    ).values());

    uniqueData.forEach(row => {
        const tr = document.createElement('tr');
        tr.classList.add('app-row');
        const isCompleted = completedAppsList.includes(row['Application Name']);
        
        if (isCompleted) {
            tr.classList.add('completed-app');
        }
        
        tr.dataset.appName = row['Application Name'];
        tr.dataset.status = isCompleted ? 'completed' : 'uncompleted';
        tr.dataset.scope = row['Assessment Scope'] || '';

        // Create cells for each column
        const appNameCell = document.createElement('td');
        appNameCell.textContent = row['Application Name'] || '';
        if (isCompleted) {
            const badge = document.createElement('span');
            badge.className = 'status-badge completed';
            badge.textContent = '✓ Completed';
            appNameCell.appendChild(badge);
        }
        tr.appendChild(appNameCell);

        const scopeCell = document.createElement('td');
        scopeCell.textContent = row['Assessment Scope'] || '';
        tr.appendChild(scopeCell);

        const dataCenterCell = document.createElement('td');
        dataCenterCell.textContent = row['Data Center'] || ''; // Use the Data Center field directly
        tr.appendChild(dataCenterCell);

        // Add action button cell
        const buttonCell = document.createElement('td');
        buttonCell.classList.add('action-cell');
        
        const button = document.createElement('button');
        button.textContent = isCompleted ? 'View Results' : 'Start Strategy Questions';
        button.className = isCompleted ? 'view-results-btn' : 'start-questions-btn';
        button.addEventListener('click', () => {
            localStorage.setItem("appName", row['Application Name']);
            ipcRenderer.send('open-strategy-questions-window', row['Application Name']);
        });
        buttonCell.appendChild(button);
        tr.appendChild(buttonCell);

        // Update counters
        totalApps++;
        const scope = (row['Assessment Scope'] || '').trim();
        if (scope === 'In Scope') inScope++;
        if (scope === 'Out of Scope') outScope++;

        tableBody.appendChild(tr);
    });

    // Update metrics
    document.getElementById('totalApps').textContent = totalApps;
    document.getElementById('inScope').textContent = inScope;
    document.getElementById('outScope').textContent = outScope;
    document.getElementById('completedApps').textContent = completedApps;

    // Update completed apps metric styling
    const completedMetric = document.querySelector('.metric:last-child');
    if (completedMetric) {
        completedMetric.classList.add('completed');
    }

    filterTable(); // Apply any active filters
}

// Enhanced filter function
function filterTable() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const inScopeChecked = document.getElementById('inScopeCheckbox').checked;
    const outScopeChecked = document.getElementById('outScopeCheckbox').checked;
    const completedChecked = document.getElementById('completedCheckbox').checked;
    const uncompletedChecked = document.getElementById('uncompletedCheckbox').checked;

    const rows = document.querySelectorAll('.app-row');
    rows.forEach(row => {
        const appName = row.dataset.appName.toLowerCase();
        const scope = row.dataset.scope;
        const isCompleted = row.dataset.status === 'completed';

        const matchesSearch = appName.includes(searchValue);
        const matchesScope = (!inScopeChecked && !outScopeChecked) || 
                           (inScopeChecked && scope === 'In Scope') ||
                           (outScopeChecked && scope === 'Out of Scope');
        const matchesStatus = (!completedChecked && !uncompletedChecked) ||
                            (completedChecked && isCompleted) ||
                            (uncompletedChecked && !isCompleted);

        row.style.display = matchesSearch && matchesScope && matchesStatus ? '' : 'none';
    });
}

// Event listeners for filters
document.getElementById('searchInput').addEventListener('input', filterTable);
document.getElementById('inScopeCheckbox').addEventListener('change', filterTable);
document.getElementById('outScopeCheckbox').addEventListener('change', filterTable);
document.getElementById('completedCheckbox').addEventListener('change', filterTable);
document.getElementById('uncompletedCheckbox').addEventListener('change', filterTable);

// Add event listener for app completion
ipcRenderer.on('app-completed', async () => {
    await refreshDisplay();
});

// Add event listener for data refresh
ipcRenderer.on('refresh-data', async () => {
    await refreshDisplay();
});

// Function to refresh the display
async function refreshDisplay() {
    // Fetch latest completed apps
    await fetchCompletedApps();
    
    // Refresh the table if we have data
    const storedData = localStorage.getItem('appToServerData');
    if (storedData) {
        await displayData(JSON.parse(storedData));
    }
}

// Update the save function in strategy-questions.js to trigger a refresh
function saveToFile() {
    const initialTimePlacement = document.getElementById('initialTimePlacement').value;
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement').textContent;

    // ... existing score calculations ...

    const outputData = {
        applicationName: document.getElementById('applicationName').textContent,
        initialTimePlacement,
        confirmedTimePlacement,
        answers: answersData,
        summary: scores
    };

    // Send the data to the main process to save to a file
    ipcRenderer.send('save-answers-to-file', outputData);
    
    // Request a refresh of the main window
    ipcRenderer.invoke('refresh-main-window');
}

// Initialize UI on load
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCompletedApps(); // Fetch completed apps on initial load
    document.getElementById('statusMessage').textContent = "Please upload an Excel file.";
    
    // If we have stored data, display it
    const storedData = localStorage.getItem('appToServerData');
    if (storedData) {
        await displayData(JSON.parse(storedData));
    }
    
    // Add event listeners for filters
    document.getElementById('searchInput').addEventListener('input', filterTable);
    document.getElementById('inScopeCheckbox').addEventListener('change', filterTable);
    document.getElementById('outScopeCheckbox').addEventListener('change', filterTable);
    document.getElementById('completedCheckbox').addEventListener('change', filterTable);
    document.getElementById('uncompletedCheckbox').addEventListener('change', filterTable);
});

// Listen for distributionThreshold value from the main process
ipcRenderer.on('set-distribution-threshold', (event, threshold) => {
    document.getElementById('distributionThreshold').textContent = threshold;
});