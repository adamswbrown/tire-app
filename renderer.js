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

function displayData(data) {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    let totalApps = 0;
    let inScope = 0;
    let outScope = 0;

    // Remove duplicates based on the 'Application Name'
    const uniqueData = Array.from(new Map(data.map(item => [item['Application Name'], item])).values());

    uniqueData.forEach(row => {
        const tr = document.createElement('tr');

        const fields = [
            'Application Name',
            'Server',
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

// Event listeners for search input and checkboxes
searchInput.addEventListener('input', filterData);
inScopeCheckbox.addEventListener('change', filterData);
outScopeCheckbox.addEventListener('change', filterData);

function filterData() {
    const searchValue = searchInput.value.toLowerCase();
    const inScopeChecked = inScopeCheckbox.checked;
    const outScopeChecked = outScopeCheckbox.checked;

    let filteredData = JSON.parse(localStorage.getItem('appToServerData') || '[]');

    // Filter by search term
    if (searchValue) {
        filteredData = filteredData.filter(row => row['Application Name'].toLowerCase().includes(searchValue));
    }

    // Filter by In Scope checkbox
    if (inScopeChecked) {
        filteredData = filteredData.filter(row => row['Assessment Scope'] === 'In Scope');
    }

    // Filter by Out of Scope checkbox
    if (outScopeChecked) {
        filteredData = filteredData.filter(row => row['Assessment Scope'] === 'Out of Scope');
    }

    // Display the filtered data
    displayData(filteredData);
}

// Update strategy questions data and save it
function updateClientAnswer(applicationName, updatedAnswers) {
    // Retrieve the stored questions and update the data
    let storedData = localStorage.getItem('appToServerData');
    storedData = storedData ? JSON.parse(storedData) : [];

    // Find the application and update the answers
    const app = storedData.find(app => app['Application Name'] === applicationName);
    if (app) {
        app.strategyQuestions = updatedAnswers;

        // Save the updated data back to local storage
        localStorage.setItem('appToServerData', JSON.stringify(storedData));
        console.log('Data updated and saved.');
    } else {
        console.error('Application not found in stored data');
    }
}

// Handle strategy questions table and save answers
function populateStrategyQuestionsTable(strategyQuestions, applicationName) {
    const tableBody = document.querySelector('#strategyQuestionsTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    strategyQuestions.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Create the table cells
        const values = [
            row.time,
            row.characteristics,
            row.clientAnswer,
            row.clientScore,
            row.weight,
            row.question,
            row.category,
            row.extendedAnswer,
            row.sampleDrivers
        ];

        values.forEach((value, cellIndex) => {
            const td = document.createElement('td');

            // For the 'Client Answer' field (index 2), create a dropdown
            if (cellIndex === 2) {
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

                // Add an event listener to save the updated answer and calculate Client Score
                select.addEventListener('change', (event) => {
                    row.clientAnswer = event.target.value;
                    // Calculate Client Score based on Client Answer and Weight
                    row.clientScore = calculateClientScore(row.clientAnswer, row.weight);
                    // Save the updated answers
                    updateClientAnswer(applicationName, strategyQuestions);
                    // Update the Client Score field in the table
                    td.nextElementSibling.textContent = row.clientScore;
                });

                td.appendChild(select);
            } else if (cellIndex === 3) {
                // For Client Score field, calculate based on the answer
                td.textContent = calculateClientScore(row.clientAnswer, row.weight);
            } else {
                td.textContent = value || '';  // For other cells, just add the text content
            }

            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}

// Calculate Client Score based on Client Answer and Weight
function calculateClientScore(clientAnswer, weight) {
    if (clientAnswer === 'Yes') {
        return weight;
    } else if (clientAnswer === 'No') {
        return 0;
    } else if (clientAnswer === 'Partial/Unsure') {
        return weight / 2;
    }
    return 'Enter Client Answer';
}

// Listen for the application name when opening the strategy questions window
ipcRenderer.on('open-strategy-questions-window', (event, applicationName) => {
    // Retrieve the strategy questions for this application
    const storedData = localStorage.getItem('appToServerData');
    const data = storedData ? JSON.parse(storedData) : [];
    const appData = data.find(app => app['Application Name'] === applicationName);

    if (appData && appData.strategyQuestions) {
        populateStrategyQuestionsTable(appData.strategyQuestions, applicationName);
    } else {
        console.error('Application data not found');
    }
});
