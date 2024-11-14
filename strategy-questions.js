const { ipcRenderer } = require('electron');

// Global variable to store strategy questions
let strategyQuestions = [];

// Function to fetch the JSON data and populate the questions
async function loadStrategyQuestions() {
    try {
        const response = await fetch('questions.json');  // Assuming questions.json is in the same directory as the JS file
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        strategyQuestions = await response.json();
        console.log("Strategy questions loaded:", strategyQuestions);
        populateStrategyQuestionsTable();  // Populate the table after loading the questions
    } catch (error) {
        console.error('Error loading strategy questions:', error);
    }
}

// Populate the Strategy Questions Table
function populateStrategyQuestionsTable() {
    const tableBody = document.querySelector('#strategyQuestionsTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    strategyQuestions.forEach((row, index) => {
        const tr = document.createElement('tr');
        const values = [
            row.time,
            row.characteristics,
            row.clientAnswer,
            row.clientScore,  // Initially 0
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
                const options = ['-', 'No', 'Partial/Unsure', 'Yes'];
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    if (option === value) {
                        optionElement.selected = true;
                    }
                    select.appendChild(optionElement);
                });

                // Event listener to update Client Answer and recalculate Client Score
                select.addEventListener('change', (event) => {
                    row.clientAnswer = event.target.value;
                    row.clientScore = calculateClientScore(row.clientAnswer, row.weight);

                    // Update the Client Score field in the table
                    td.nextElementSibling.textContent = row.clientScore;

                    // Recalculate and update the Client Scores for the summary table
                    updateClientScores();
                });

                td.appendChild(select);
            } else if (cellIndex === 3) { // Client Score field
                td.textContent = row.clientScore;
            } else {
                td.textContent = value || '';  // For other cells, just add the text content
            }

            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });

    // Initial Client Scores Update
    updateClientScores();
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
    return 0;  // Default to 0 if the answer is empty or invalid
}

// Update Client Scores in the summary table
function updateClientScores() {
    let tolerateScore = 0;
    let investScore = 0;
    let migrateScore = 0;
    let eliminateScore = 0;

    // Calculate total scores for each category and total weights
    let tolerateTotal = 0;
    let investTotal = 0;
    let migrateTotal = 0;
    let eliminateTotal = 0;

    strategyQuestions.forEach(row => {
        const clientScore = row.clientScore;

        if (row.time === 'Tolerate') {
            tolerateScore += clientScore;
            tolerateTotal += row.weight;
        } else if (row.time === 'Invest') {
            investScore += clientScore;
            investTotal += row.weight;
        } else if (row.time === 'Migrate') {
            migrateScore += clientScore;
            migrateTotal += row.weight;
        } else if (row.time === 'Eliminate') {
            eliminateScore += clientScore;
            eliminateTotal += row.weight;
        }
    });

    // Update the client scores for each category
    document.getElementById('tolerate-client-score').textContent = tolerateScore;
    document.getElementById('invest-client-score').textContent = investScore;
    document.getElementById('migrate-client-score').textContent = migrateScore;
    document.getElementById('eliminate-client-score').textContent = eliminateScore;

    // Update totals for each category
    document.getElementById('tolerate-total').textContent = tolerateTotal;
    document.getElementById('invest-total').textContent = investTotal;
    document.getElementById('migrate-total').textContent = migrateTotal;
    document.getElementById('eliminate-total').textContent = eliminateTotal;

    // Calculate and update the distribution for each category
    updateDistribution(tolerateScore, tolerateTotal, 'tolerate');
    updateDistribution(investScore, investTotal, 'invest');
    updateDistribution(migrateScore, migrateTotal, 'migrate');
    updateDistribution(eliminateScore, eliminateTotal, 'eliminate');
}

// Function to update the distribution for each category
function updateDistribution(clientScore, totalScore, category) {
    const distribution = totalScore > 0 ? Math.round((clientScore / totalScore) * 100) : 0;  // Round to nearest integer
    document.getElementById(`${category}-distribution`).textContent = `${distribution}%`;
    console.log(`${category.charAt(0).toUpperCase() + category.slice(1)} Distribution: ${distribution}%`);
}

// Listen for application name when opening strategy questions window
ipcRenderer.on('open-strategy-questions-window', (event, applicationName) => {
    // Set the application name in the strategy questions page header
    document.getElementById('applicationName').textContent = applicationName;

    // Retrieve strategy questions for this application
    const storedData = localStorage.getItem('appToServerData');
    const data = storedData ? JSON.parse(storedData) : [];
    const appData = data.find(app => app['Application Name'] === applicationName);

    if (appData && appData.strategyQuestions) {
        populateStrategyQuestionsTable(appData.strategyQuestions, applicationName);
    } else {
        console.error('Application data not found');
    }
});

// Initial table population and loading JSON data
loadStrategyQuestions();
