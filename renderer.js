const { ipcRenderer } = require('electron');
let currentData = [];
let completedAppsList = [];

// Function to fetch completed apps
async function fetchCompletedApps() {
    completedAppsList = await ipcRenderer.invoke('get-completed-apps');
}

// Function to filter table data
function filterTable() {
    const inScope = document.getElementById("inScopeCheckbox").checked;
    const outScope = document.getElementById("outScopeCheckbox").checked;
    const completed = document.getElementById("completedCheckbox").checked;
    const uncompleted = document.getElementById("uncompletedCheckbox").checked;
    const searchText = document.getElementById("searchInput").value.toLowerCase();

    const filteredData = currentData.filter(item => {
        const isCompleted = completedAppsList.includes(item['Application Name']);
        const inScopeMatch = !inScope || item['Assessment Scope'] === "In Scope";
        const outScopeMatch = !outScope || item['Assessment Scope'] === "Out of Scope";
        const completedMatch = !completed || isCompleted;
        const uncompletedMatch = !uncompleted || !isCompleted;
        const searchMatch = !searchText || 
            item['Application Name'].toLowerCase().includes(searchText) ||
            item['Assessment Scope'].toLowerCase().includes(searchText) ||
            item['Data Center'].toLowerCase().includes(searchText);

        return inScopeMatch && outScopeMatch && completedMatch && uncompletedMatch && searchMatch;
    });

    displayData(filteredData);
}

// Function to display data in the table
function displayData(data) {
    const tableBody = document.getElementById("dataTableBody");
    tableBody.innerHTML = "";

    data.forEach(item => {
        const row = document.createElement("tr");
        const isCompleted = completedAppsList.includes(item['Application Name']);
        
        if (isCompleted) {
            row.classList.add('completed-row');
        }

        const appNameCell = document.createElement("td");
        appNameCell.textContent = item['Application Name'];
        if (isCompleted) {
            const checkmark = document.createElement("span");
            checkmark.textContent = " ✓";
            checkmark.className = "checkmark";
            appNameCell.appendChild(checkmark);
        }

        const scopeCell = document.createElement("td");
        scopeCell.textContent = item['Assessment Scope'];

        const dataCenterCell = document.createElement("td");
        dataCenterCell.textContent = item['Data Center'];

        const actionCell = document.createElement("td");
        const actionButton = document.createElement("button");
        
        if (isCompleted) {
            actionButton.textContent = "View Results";
            actionButton.onclick = () => viewResults(item['Application Name']);
        } else {
            actionButton.textContent = "Start Strategy Questions";
            actionButton.onclick = () => startStrategyQuestions(item['Application Name']);
        }
        actionCell.appendChild(actionButton);

        row.appendChild(appNameCell);
        row.appendChild(scopeCell);
        row.appendChild(dataCenterCell);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });

    updateMetrics(data);
}

// Function to update metrics
function updateMetrics(data) {
    const totalApps = data.length;
    const inScopeCount = data.filter(item => item['Assessment Scope'] === "In Scope").length;
    const outScopeCount = data.filter(item => item['Assessment Scope'] === "Out of Scope").length;
    const completedCount = completedAppsList.length;

    document.getElementById("totalApps").textContent = totalApps;
    document.getElementById("inScope").textContent = inScopeCount;
    document.getElementById("outScope").textContent = outScopeCount;
    document.getElementById("completedApps").textContent = completedCount;
}

// Function to start strategy questions
function startStrategyQuestions(appName) {
    ipcRenderer.send('open-strategy-questions-window', appName);
}

// Function to view results
async function viewResults(appName) {
    const appData = await ipcRenderer.invoke('get-app-data', appName);
    if (appData) {
        // Handle viewing results (you can implement this based on your needs)
        console.log('Viewing results for:', appData);
    }
}

// Event listener for file upload
document.getElementById("uploadBtn").addEventListener("click", async () => {
    try {
        const result = await ipcRenderer.invoke('upload-file');
        if (result.error) {
            document.getElementById("statusMessage").textContent = result.error;
            return;
        }
        currentData = result;
        await fetchCompletedApps();
        filterTable();
        document.getElementById("statusMessage").textContent = "File uploaded successfully";
    } catch (error) {
        document.getElementById("statusMessage").textContent = "Error uploading file";
        console.error('Error:', error);
    }
});

// Event listener for clearing data
document.getElementById("clearStorageBtn").addEventListener("click", () => {
    localStorage.clear();
    currentData = [];
    completedAppsList = [];
    document.getElementById("statusMessage").textContent = "Data cleared successfully";
    filterTable();
});

// Event listeners for filtering
document.getElementById("searchInput").addEventListener("input", filterTable);
document.getElementById("inScopeCheckbox").addEventListener("change", filterTable);
document.getElementById("outScopeCheckbox").addEventListener("change", filterTable);
document.getElementById("completedCheckbox").addEventListener("change", filterTable);
document.getElementById("uncompletedCheckbox").addEventListener("change", filterTable);

// Event listener for completed apps
ipcRenderer.on('app-completed', async (event, appName) => {
    await fetchCompletedApps();
    filterTable();
});

// Event listener for data refresh
ipcRenderer.on('refresh-data', async () => {
    await fetchCompletedApps();
    filterTable();
});

// Export completed apps
document.getElementById("exportBtn").addEventListener("click", async () => {
    try {
        const result = await ipcRenderer.invoke('export-completed-apps');
        if (result.success) {
            document.getElementById("statusMessage").textContent = `Exported to: ${result.path}`;
        } else {
            document.getElementById("statusMessage").textContent = `Export failed: ${result.error}`;
        }
    } catch (error) {
        document.getElementById("statusMessage").textContent = "Error exporting data";
        console.error('Export error:', error);
    }
});

// Initialize the display when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCompletedApps();
    if (currentData.length > 0) {
        filterTable();
    }
});

// Listen for distributionThreshold value from the main process
ipcRenderer.on('set-distribution-threshold', (event, threshold) => {
    document.getElementById('distributionThreshold').textContent = threshold;
});