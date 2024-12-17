const { ipcRenderer } = require('electron');

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
        displayData(data); // Display data in the table
    }
});

// Function to display data in the table
function displayData(data) {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    let totalApps = 0;
    let inScope = 0;
    let outScope = 0;

    const uniqueData = Array.from(new Map(
        data.filter(item => item['Application Name'] !== 'Unassociated')
            .map(item => [item['Application Name'], item])
    ).values());

    uniqueData.forEach(row => {
        const tr = document.createElement('tr');
        tr.classList.add('app-row');
        tr.dataset.appName = row['Application Name']; // For completed app check

        const fields = ['Application Name', 'Assessment Scope', 'Data Center'];
        const scope = (row['Assessment Scope'] || '').trim();

        totalApps++;
        if (scope === 'In Scope') inScope++;
        if (scope === 'Out of Scope') outScope++;

        fields.forEach(field => {
            const td = document.createElement('td');
            td.textContent = row[field] || '';
            tr.appendChild(td);
        });

        // Add "Start Strategy Questions" button
        const buttonCell = document.createElement('td');
        buttonCell.classList.add('action-cell');
        const startQuestionsButton = document.createElement('button');
        startQuestionsButton.textContent = 'Start Strategy Questions';
        startQuestionsButton.addEventListener('click', () => {
            localStorage.setItem("appName", row['Application Name']);
            ipcRenderer.send('open-strategy-questions-window', row['Application Name']);
        });
        buttonCell.appendChild(startQuestionsButton);
        tr.appendChild(buttonCell);

        tableBody.appendChild(tr);
    });

    // Update metrics
    document.getElementById('totalApps').textContent = totalApps;
    document.getElementById('inScope').textContent = inScope;
    document.getElementById('outScope').textContent = outScope;

    // Highlight completed apps
    updateCompletedAppStatus();
}

// Fetch and highlight completed apps
async function updateCompletedAppStatus() {
    try {
        const completedApps = await ipcRenderer.invoke('get-completed-apps');
        const rows = document.querySelectorAll('.app-row');

        rows.forEach(row => {
            const appName = row.dataset.appName;
            if (completedApps.includes(appName)) {
                row.classList.add('completed'); // Highlight completed row
                row.querySelector('.action-cell').innerHTML = '<span class="status-completed">Completed</span>';
            }
        });
    } catch (error) {
        console.error('Error updating completed app status:', error);
    }
}

// Search and filter functionality
const searchInput = document.getElementById('searchInput');
const inScopeCheckbox = document.getElementById('inScopeCheckbox');
const outScopeCheckbox = document.getElementById('outScopeCheckbox');

inScopeCheckbox.checked = true;
outScopeCheckbox.checked = true;

searchInput.addEventListener('input', filterData);
inScopeCheckbox.addEventListener('change', filterData);
outScopeCheckbox.addEventListener('change', filterData);

function filterData() {
    const searchValue = searchInput.value.toLowerCase();
    const inScopeChecked = inScopeCheckbox.checked;
    const outScopeChecked = outScopeCheckbox.checked;

    let filteredData = JSON.parse(localStorage.getItem('appToServerData') || '[]');
    filteredData = filteredData.filter(row => row['Application Name'] !== 'Unassociated');

    if (searchValue) {
        filteredData = filteredData.filter(row => row['Application Name'].toLowerCase().includes(searchValue));
    }

    if (inScopeChecked && outScopeChecked) {
        // Show all
    } else if (inScopeChecked) {
        filteredData = filteredData.filter(row => row['Assessment Scope'] === 'In Scope');
    } else if (outScopeChecked) {
        filteredData = filteredData.filter(row => row['Assessment Scope'] === 'Out of Scope');
    }

    displayData(filteredData);
}

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('appToServerData'); // Prevent pre-population
    document.getElementById('statusMessage').textContent = "Please upload an Excel file.";
});

// Listen for distributionThreshold value from the main process
ipcRenderer.on('set-distribution-threshold', (event, threshold) => {
    document.getElementById('distributionThreshold').textContent = threshold;
});