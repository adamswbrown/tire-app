const { ipcRenderer } = require('electron');
let currentData = [];
let completedAppsList = [];

// Function to fetch completed apps
async function fetchCompletedApps() {
    completedAppsList = await ipcRenderer.invoke('get-completed-apps');
}

// Listen for uploaded data from main process
ipcRenderer.on('uploaded-data', (event, data) => {
    if (data) {
        currentData = data;
        filterTable();
        updateMetrics(data);
        document.getElementById("statusMessage").textContent = "Data loaded successfully";
    }
});

// Function to initialize data on load
async function initializeData() {
    // Try to get any stored data
    const data = await ipcRenderer.invoke('get-uploaded-data');
    if (data) {
        currentData = data;
        filterTable();
        updateMetrics(data);
    }
}

// Function to filter table data
function filterTable() {
    console.log('Filter function called');
    
    // Get filter elements
    const inScopeCheckbox = document.getElementById("inScopeCheckbox");
    const outScopeCheckbox = document.getElementById("outScopeCheckbox");
    const completedCheckbox = document.getElementById("completedCheckbox");
    const uncompletedCheckbox = document.getElementById("uncompletedCheckbox");
    const searchInput = document.getElementById("searchInput");

    // Check if elements exist
    if (!inScopeCheckbox || !outScopeCheckbox || !completedCheckbox || !uncompletedCheckbox || !searchInput) {
        console.error('Filter elements not found');
        return;
    }

    const inScope = inScopeCheckbox.checked;
    const outScope = outScopeCheckbox.checked;
    const completed = completedCheckbox.checked;
    const uncompleted = uncompletedCheckbox.checked;
    const searchText = searchInput.value.toLowerCase().trim();

    console.log('Filter states:', { inScope, outScope, completed, uncompleted, searchText });

    const filteredData = currentData.filter(item => {
        // Debug log each item's scope
        console.log(`Processing item: ${item['Application Name']}, Scope: ${item['Assessment Scope']}`);

        // Scope filtering
        let scopeMatch = true;
        if (inScope && !outScope) {
            scopeMatch = item['Assessment Scope'] === "In Scope";
        } else if (!inScope && outScope) {
            scopeMatch = item['Assessment Scope'] === "Out of Scope";
        } else if (inScope && outScope) {
            scopeMatch = true; // Show both if both are checked
        }

        // Completion status
        const isCompleted = completedAppsList.includes(item['Application Name']);
        let completionMatch = true;
        if (completed && !uncompleted) {
            completionMatch = isCompleted;
        } else if (!completed && uncompleted) {
            completionMatch = !isCompleted;
        } else if (completed && uncompleted) {
            completionMatch = true; // Show both if both are checked
        }

        // Search text
        let searchMatch = true;
        if (searchText) {
            searchMatch = item['Application Name'].toLowerCase().includes(searchText) ||
                         item['Assessment Scope'].toLowerCase().includes(searchText) ||
                         (item['Data Center'] && item['Data Center'].toLowerCase().includes(searchText));
        }

        const shouldInclude = scopeMatch && completionMatch && searchMatch;
        console.log(`Filter results for ${item['Application Name']}: `, 
            { scopeMatch, completionMatch, searchMatch, shouldInclude });
        
        return shouldInclude;
    });

    console.log(`Filtered data length: ${filteredData.length} (from ${currentData.length} total)`);
    displayData(filteredData);
    updateMetrics(filteredData);
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

        // Application Name cell
        const appNameCell = document.createElement("td");
        appNameCell.textContent = item['Application Name'];

        // Assessment Scope cell
        const scopeCell = document.createElement("td");
        scopeCell.textContent = item['Assessment Scope'];

        // Data Center cell
        const dataCenterCell = document.createElement("td");
        dataCenterCell.textContent = item['Data Center'];

        // Action cell
        const actionCell = document.createElement("td");
        actionCell.className = 'action-cell';
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
    // Open strategy questions window in view mode
    ipcRenderer.send('open-strategy-questions-window', appName);
}

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

// Create export template
document.getElementById("createExportBtn").addEventListener("click", async () => {
    try {
        const result = await ipcRenderer.invoke('create-export-template');
        if (result.success) {
            document.getElementById("statusMessage").textContent = `Clean export template created at: ${result.path}`;
        } else {
            document.getElementById("statusMessage").textContent = `Failed to create export template: ${result.error}`;
        }
    } catch (error) {
        document.getElementById("statusMessage").textContent = "Error creating export template";
        console.error('Export template error:', error);
    }
});

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    
    // Initialize filter elements
    const elements = {
        searchInput: document.getElementById("searchInput"),
        inScopeCheckbox: document.getElementById("inScopeCheckbox"),
        outScopeCheckbox: document.getElementById("outScopeCheckbox"),
        completedCheckbox: document.getElementById("completedCheckbox"),
        uncompletedCheckbox: document.getElementById("uncompletedCheckbox")
    };

    // Check if elements exist and attach listeners
    Object.entries(elements).forEach(([name, element]) => {
        if (element) {
            console.log(`Found ${name} element`);
            if (name === 'searchInput') {
                element.addEventListener("input", () => {
                    console.log('Search input changed:', element.value);
                    filterTable();
                });
            } else {
                element.addEventListener("change", () => {
                    console.log(`${name} changed:`, element.checked);
                    filterTable();
                });
            }
        } else {
            console.error(`${name} element not found`);
        }
    });

    await fetchCompletedApps();
    await initializeData();
});

// Listen for distributionThreshold value from the main process
ipcRenderer.on('set-distribution-threshold', (event, threshold) => {
    document.getElementById('distributionThreshold').textContent = threshold;
});