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
        const isAppQuestionsCompleted = completedAppsList.includes(item['Application Name'] + '_app_questions');
        const isStrategyQuestionsCompleted = completedAppsList.includes(item['Application Name']);
        
        if (isStrategyQuestionsCompleted) {
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
        
        // Create container for buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.className = 'action-buttons-container';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.display = 'flex';
        
        // Create App Questions button
        const appQuestionsButton = document.createElement("button");
        appQuestionsButton.textContent = isAppQuestionsCompleted ? "View App Questions" : "Start App Questions";
        appQuestionsButton.className = 'app-questions-button';
        appQuestionsButton.onclick = () => startAppQuestions(item['Application Name']);
        
        // Create Strategy Questions button
        const strategyButton = document.createElement("button");
        if (isStrategyQuestionsCompleted) {
            strategyButton.textContent = "View Strategy Results";
            strategyButton.onclick = () => viewResults(item['Application Name']);
        } else {
            strategyButton.textContent = "Start Strategy Questions";
            strategyButton.onclick = () => startStrategyQuestions(item['Application Name']);
        }
        
        // Add buttons to container
        buttonContainer.appendChild(appQuestionsButton);
        buttonContainer.appendChild(strategyButton);
        
        // Add container to action cell
        actionCell.appendChild(buttonContainer);

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

// Function to show the clear data modal
function showClearDataModal() {
    const modal = document.getElementById('clearDataModal');
    modal.classList.add('show');
}

// Function to hide the clear data modal
function hideClearDataModal() {
    const modal = document.getElementById('clearDataModal');
    modal.classList.remove('show');
}

// Function to clear all data and return to start screen
async function clearAllData() {
    try {
        // Clear local storage
        localStorage.clear();
        
        // Reset application state
        currentData = [];
        completedAppsList = [];
        
        // Clear the table and metrics
        displayData([]);
        updateMetrics([]);
        
        // Show status message
        document.getElementById("statusMessage").textContent = "Data cleared successfully";
        
        // Hide the modal
        hideClearDataModal();
        
        // Return to start screen
        ipcRenderer.send('return-to-start');
    } catch (error) {
        console.error('Error clearing data:', error);
        document.getElementById("statusMessage").textContent = "Error clearing data";
    }
}

// Event listeners for modal buttons
document.addEventListener('DOMContentLoaded', () => {
    // Cancel button hides the modal
    const cancelButton = document.getElementById('cancelClearBtn');
    if (cancelButton) {
        cancelButton.addEventListener('click', hideClearDataModal);
    }

    // Confirm button triggers the clear
    const confirmButton = document.getElementById('confirmClearBtn');
    if (confirmButton) {
        confirmButton.addEventListener('click', clearAllData);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('clearDataModal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                hideClearDataModal();
            }
        });
    }
});

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

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    
    // Initialize admin button
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        console.log('Found admin button, attaching click listener');
        adminBtn.addEventListener('click', () => {
            console.log('Admin button clicked');
            ipcRenderer.send('open-admin');
        });
    } else {
        console.error('Admin button not found in the DOM');
    }
    
    // Initialize filter elements
    const elements = {
        searchInput: document.getElementById("searchInput"),
        inScopeCheckbox: document.getElementById("inScopeCheckbox"),
        outScopeCheckbox: document.getElementById("outScopeCheckbox"),
        completedCheckbox: document.getElementById("completedCheckbox"),
        uncompletedCheckbox: document.getElementById("uncompletedCheckbox"),
        clearStorageBtn: document.getElementById("clearStorageBtn"),
        exportBtn: document.getElementById("exportBtn"),
        cancelClearBtn: document.getElementById("cancelClearBtn"),
        confirmClearBtn: document.getElementById("confirmClearBtn"),
        clearDataModal: document.getElementById("clearDataModal")
    };

    // Attach filter listeners
    if (elements.searchInput) {
        elements.searchInput.addEventListener("input", filterTable);
    }
    if (elements.inScopeCheckbox) {
        elements.inScopeCheckbox.addEventListener("change", filterTable);
    }
    if (elements.outScopeCheckbox) {
        elements.outScopeCheckbox.addEventListener("change", filterTable);
    }
    if (elements.completedCheckbox) {
        elements.completedCheckbox.addEventListener("change", filterTable);
    }
    if (elements.uncompletedCheckbox) {
        elements.uncompletedCheckbox.addEventListener("change", filterTable);
    }

    // Attach clear storage button listener
    if (elements.clearStorageBtn) {
        elements.clearStorageBtn.addEventListener("click", showClearDataModal);
    }

    // Attach export button listener
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener("click", async () => {
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
    }

    // Attach modal button listeners
    if (elements.cancelClearBtn) {
        elements.cancelClearBtn.addEventListener('click', hideClearDataModal);
    }
    if (elements.confirmClearBtn) {
        elements.confirmClearBtn.addEventListener('click', clearAllData);
    }
    if (elements.clearDataModal) {
        elements.clearDataModal.addEventListener('click', (event) => {
            if (event.target === elements.clearDataModal) {
                hideClearDataModal();
            }
        });
    }

    // Log any missing elements
    Object.entries(elements).forEach(([name, element]) => {
        if (!element) {
            console.error(`Element not found: ${name}`);
        } else {
            console.log(`Found element: ${name}`);
        }
    });

    await fetchCompletedApps();
    await initializeData();
});

// Listen for distributionThreshold value from the main process
ipcRenderer.on('set-distribution-threshold', (event, threshold) => {
    document.getElementById('distributionThreshold').textContent = threshold;
});

// Listen for threshold updates
ipcRenderer.on('thresholds-updated', (event, thresholds) => {
    console.log('Thresholds updated:', thresholds);
    if (document.getElementById('distribution-threshold')) {
        document.getElementById('distribution-threshold').textContent = thresholds.distributionThreshold;
    }
    if (document.getElementById('tiebreaker-threshold')) {
        document.getElementById('tiebreaker-threshold').textContent = thresholds.tiebreakThreshold;
    }
});

// Add new function to handle app questions
function startAppQuestions(appName) {
    ipcRenderer.send('open-app-questions-window', appName);
}