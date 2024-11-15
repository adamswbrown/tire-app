const { ipcRenderer } = require('electron');

// Event listener for the "Upload Excel File" button
document.getElementById('uploadBtn').addEventListener('click', () => {
    ipcRenderer.send('upload-file');
    console.log("File upload initiated.");
});

ipcRenderer.on('upload-complete', (event, data) => {
    const statusMessage = document.getElementById('statusMessage');

    if (data.error) {
        statusMessage.textContent = `Error: ${data.error}`;
        console.error("Error uploading file:", data.error);
    } else {
        // If data is valid, store and process it
        localStorage.setItem('appToServerData', JSON.stringify(data));
        statusMessage.textContent = 'Upload complete! Data has been stored successfully.';

        // Display data in the table
        displayData(data);
    }
});

// Function to display data in the table
function displayData(data) {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    let totalApps = 0;
    let inScope = 0;
    let outScope = 0;

    // Remove duplicates and exclude "Unassociated" apps
    const uniqueData = Array.from(new Map(data.filter(item => item['Application Name'] !== 'Unassociated').map(item => [item['Application Name'], item])).values());

    uniqueData.forEach(row => {
        const tr = document.createElement('tr');

        const fields = [
            'Application Name',
            'Assessment Scope',
            'Data Center'
        ];

        const scope = (row['Assessment Scope'] || '').trim();
        totalApps++;
        if (scope === 'In Scope') {
            inScope++;
        } else if (scope === 'Out of Scope') {
            outScope++;
        }

        fields.forEach(field => {
            const td = document.createElement('td');
            td.textContent = row[field] || '';
            tr.appendChild(td);
        });

        // Add the "Start Strategy Questions" button in the 'Action' column
        const buttonCell = document.createElement('td');
        const startQuestionsButton = document.createElement('button');
        startQuestionsButton.textContent = 'Start Strategy Questions';
        startQuestionsButton.addEventListener('click', () => {
            // Store the chosen application name in local storage
            localStorage.setItem("appName", row['Application Name']);
            
            // Open the strategy questions window
            ipcRenderer.send('open-strategy-questions-window', row['Application Name']);
        });
        buttonCell.appendChild(startQuestionsButton);
        tr.appendChild(buttonCell);

        tableBody.appendChild(tr);
    });

    // Update the app count
    document.getElementById('totalApps').textContent = totalApps;
    document.getElementById('inScope').textContent = inScope;
    document.getElementById('outScope').textContent = outScope;
}

// Search and filter functionality
const searchInput = document.getElementById('searchInput');
const inScopeCheckbox = document.getElementById('inScopeCheckbox');
const outScopeCheckbox = document.getElementById('outScopeCheckbox');

// Default both checkboxes to be checked
inScopeCheckbox.checked = true;
outScopeCheckbox.checked = true;

// Listen for changes in search input or checkbox status
searchInput.addEventListener('input', filterData);
inScopeCheckbox.addEventListener('change', filterData);
outScopeCheckbox.addEventListener('change', filterData);

function filterData() {
    const searchValue = searchInput.value.toLowerCase();
    const inScopeChecked = inScopeCheckbox.checked;
    const outScopeChecked = outScopeCheckbox.checked;

    let filteredData = JSON.parse(localStorage.getItem('appToServerData') || '[]');

    // Exclude "Unassociated" applications
    filteredData = filteredData.filter(row => row['Application Name'] !== 'Unassociated');

    // Apply the filters based on search input and checkbox status
    if (searchValue) {
        filteredData = filteredData.filter(row => row['Application Name'].toLowerCase().includes(searchValue));
    }

    // Apply scope filters
    if (inScopeChecked && outScopeChecked) {
        // Both checked: show all
    } else if (inScopeChecked) {
        filteredData = filteredData.filter(row => row['Assessment Scope'] === 'In Scope');
    } else if (outScopeChecked) {
        filteredData = filteredData.filter(row => row['Assessment Scope'] === 'Out of Scope');
    }

    displayData(filteredData);
}

// Populate and make Extended Answer / Rationale editable
function populateStrategyQuestionsTable(strategyQuestions, applicationName) {
    const tableBody = document.querySelector('#strategyQuestionsTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    strategyQuestions.forEach((row, index) => {
        const tr = document.createElement('tr');

        const values = [
            row.time,
            row.characteristics,
            row.clientAnswer,
            row.clientScore,
            row.weight,
            row.question,
            row.category,
            row.extendedAnswer, // Editable field
            row.sampleDrivers
        ];

        values.forEach((value, cellIndex) => {
            const td = document.createElement('td');

            if (cellIndex === 2) { // Client Answer dropdown
                const select = document.createElement('select');
                const options = ['No', 'Partial/Unsure', 'Yes'];
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    if (option === value) {
                        optionElement.selected = true;
                    }
                    select.appendChild(optionElement);
                });

                select.addEventListener('change', (event) => {
                    row.clientAnswer = event.target.value;
                    row.clientScore = calculateClientScore(row.clientAnswer, row.weight);
                    updateClientAnswer(applicationName, strategyQuestions);
                    td.nextElementSibling.textContent = row.clientScore;
                });

                td.appendChild(select);
            } else if (cellIndex === 3) { // Client Score field
                td.textContent = calculateClientScore(row.clientAnswer, row.weight);
            } else if (cellIndex === 7) { // Extended Answer / Rationale column
                const textArea = document.createElement('textarea');
                textArea.value = value || '';
                textArea.rows = 2;

                textArea.addEventListener('blur', () => {
                    row.extendedAnswer = textArea.value;
                    updateClientAnswer(applicationName, strategyQuestions);
                });

                td.appendChild(textArea);
            } else {
                td.textContent = value || '';
            }

            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}

// Calculate Client Score based on Client Answer and Weight
function calculateClientScore(clientAnswer, weight) {
    if (clientAnswer === 'Yes') return weight;
    if (clientAnswer === 'No') return 0;
    if (clientAnswer === 'Partial/Unsure') return weight / 2;
    return 0;  // Default to 0 if the answer is empty or invalid
}

// Update Client Answer in the local storage
function updateClientAnswer(applicationName, updatedAnswers) {
    let storedData = localStorage.getItem('appToServerData');
    storedData = storedData ? JSON.parse(storedData) : [];

    const app = storedData.find(app => app['Application Name'] === applicationName);
    if (app) {
        app.strategyQuestions = updatedAnswers;
        localStorage.setItem('appToServerData', JSON.stringify(storedData));
        console.log('Data updated and saved.');
    } else {
        console.error('Application not found in stored data');
    }
}

// Listen for the application name when opening the strategy questions window
ipcRenderer.on('open-strategy-questions-window', (event, applicationName) => {
    const storedData = localStorage.getItem('appToServerData');
    const data = storedData ? JSON.parse(storedData) : [];
    const appData = data.find(app => app['Application Name'] === applicationName);

    if (appData && appData.strategyQuestions) {
        populateStrategyQuestionsTable(appData.strategyQuestions, applicationName);
    } else {
        console.error('Application data not found');
    }
});
