const { ipcRenderer } = require('electron');

// Global variable to store strategy questions
let strategyQuestions = [];

// Initialize global variables for answered questions and total questions
let totalQuestions = 0;
let answeredQuestions = 0;

// Function to fetch the JSON data and populate the questions
async function loadStrategyQuestions() {
    try {
        const response = await fetch('questions.json');  // Assuming questions.json is in the same directory as the JS file
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        strategyQuestions = await response.json();
        console.log("Strategy questions loaded:", strategyQuestions);

        totalQuestions = strategyQuestions.length; // Set total number of questions
        populateStrategyQuestionsTable();  // Populate the table after loading the questions
        updateAnsweredQuestionsCounter();  // Update counter after loading questions
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
            row.extendedAnswer, // Editable field for "Extended Answer / Rationale"
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
                //Event Listener for Questions counter

                select.addEventListener('change', (event) => {
                    row.clientAnswer = event.target.value;
                    row.clientScore = calculateClientScore(row.clientAnswer, row.weight);
                
                    // Update the Client Score field in the table
                    td.nextElementSibling.textContent = row.clientScore;
                
                    // Recalculate and update the Client Scores for the summary table
                    updateClientScores();
                
                    // Update the question counter
                    updateAnsweredQuestionsCounter();
                });
                td.appendChild(select);
            } else if (cellIndex === 3) { // Client Score field
                td.textContent = row.clientScore;
            } else if (cellIndex === 7) { // Extended Answer / Rationale column
                // Create a textarea for the "Extended Answer / Rationale" column
                const textArea = document.createElement('textarea');
                textArea.value = value || '';
                textArea.rows = 2;

                // Save the updated text when the textarea loses focus
                textArea.addEventListener('blur', () => {
                    row.extendedAnswer = textArea.value;
                    // Optionally save the updated answers to localStorage or another persistence method
                    saveUpdatedStrategyQuestions();
                });

                td.appendChild(textArea);
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
function updateAnsweredQuestionsCounter() {
    answeredQuestions = strategyQuestions.filter(q => q.clientAnswer !== '-').length; // Count answered questions
    const counterElement = document.getElementById('questionsAnsweredCounter');
    if (counterElement) {
        counterElement.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`; // Update the counter display
    }
}

// Save the updated strategy questions to localStorage or another persistence method
function saveUpdatedStrategyQuestions() {
    localStorage.setItem('appToServerData', JSON.stringify(strategyQuestions));
    console.log('Extended Answer / Rationale saved.');
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
    let replaceScore = 0;
    let eliminateScore = 0;

    let tolerateTotal = 0;
    let investTotal = 0;
    let replaceTotal = 0;
    let eliminateTotal = 0;

    strategyQuestions.forEach(row => {
        const clientScore = row.clientScore;

        if (row.time === 'Tolerate') {
            tolerateScore += clientScore;
            tolerateTotal += row.weight;
        } else if (row.time === 'Invest') {
            investScore += clientScore;
            investTotal += row.weight;
        } else if (row.time === 'Replace') {
            replaceScore += clientScore;
            replaceTotal += row.weight;
        } else if (row.time === 'Eliminate') {
            eliminateScore += clientScore;
            eliminateTotal += row.weight;
        }
    });

    // Check for the existence of each element before updating it
    const tolerateClientScoreElem = document.getElementById('tolerate-client-score');
    const investClientScoreElem = document.getElementById('invest-client-score');
    const replaceClientScoreElem = document.getElementById('replace-client-score');
    const eliminateClientScoreElem = document.getElementById('eliminate-client-score');

    const tolerateTotalElem = document.getElementById('tolerate-total');
    const investTotalElem = document.getElementById('invest-total');
    const replaceTotalElem = document.getElementById('replace-total');
    const eliminateTotalElem = document.getElementById('eliminate-total');

    if (tolerateClientScoreElem) tolerateClientScoreElem.textContent = tolerateScore;
    if (investClientScoreElem) investClientScoreElem.textContent = investScore;
    if (replaceClientScoreElem) replaceClientScoreElem.textContent = replaceScore;
    if (eliminateClientScoreElem) eliminateClientScoreElem.textContent = eliminateScore;

    if (tolerateTotalElem) tolerateTotalElem.textContent = tolerateTotal;
    if (investTotalElem) investTotalElem.textContent = investTotal;
    if (replaceTotalElem) replaceTotalElem.textContent = replaceTotal;
    if (eliminateTotalElem) eliminateTotalElem.textContent = eliminateTotal;

    updateDistribution(tolerateScore, tolerateTotal, 'tolerate');
    updateDistribution(investScore, investTotal, 'invest');
    updateDistribution(replaceScore, replaceTotal, 'replace');
    updateDistribution(eliminateScore, eliminateTotal, 'eliminate');
}


// Function to update the distribution for each category
function updateDistribution(clientScore, totalScore, category) {
    const distribution = totalScore > 0 ? Math.round((clientScore / totalScore) * 100) : 0;  // Round to nearest integer
    const distributionCell = document.getElementById(`${category}-distribution`);
    const row = distributionCell.parentElement; // Get the entire row

    // Update the distribution cell text
    distributionCell.textContent = `${distribution}%`;

    // Apply conditional formatting: highlight the entire row if distribution is 80% or more
    if (distribution >= 80) {
        row.style.backgroundColor = 'green';
        row.style.color = 'white';  // Optional: set text color to white for better contrast
    } else {
        row.style.backgroundColor = ''; // Reset to default if less than 80%
        row.style.color = '';           // Reset text color
    }

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

ipcRenderer.on('set-distribution-threshold', (event, distributionThreshold) => {
    console.log('Received distribution threshold:', distributionThreshold); // Check if the value is received correctly
    const thresholdElement = document.getElementById('distribution-threshold');
    if (thresholdElement) {
        thresholdElement.textContent = distributionThreshold;
    }
});



// Function to save answers, notes, and summary outcomes to an external file
function saveToFile() {
    const initialTimePlacement = document.getElementById('initialTimePlacement').value;
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement').textContent;

    const answersData = strategyQuestions.map(row => ({
        time: row.time,
        characteristics: row.characteristics,
        questionAnswered: row.clientAnswer,  // Renamed from 'clientAnswer' to 'questionAnswered'
        clientScore: row.clientScore,
        weight: row.weight,
        question: row.question,
        category: row.category,
        extendedAnswer: row.extendedAnswer,
        sampleDrivers: row.sampleDrivers,
        answered: row.clientAnswer !== '-'  // Field indicating if the question was answered
    }));

    const summary = {
        tolerate: {
            score: parseInt(document.getElementById('tolerate-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('tolerate-total').textContent, 10) || 0,
            distribution: document.getElementById('tolerate-distribution').textContent
        },
        invest: {
            score: parseInt(document.getElementById('invest-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('invest-total').textContent, 10) || 0,
            distribution: document.getElementById('invest-distribution').textContent
        },
        replace: {
            score: parseInt(document.getElementById('replace-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('replace-total').textContent, 10) || 0,
            distribution: document.getElementById('replace-distribution').textContent
        },
        eliminate: {
            score: parseInt(document.getElementById('eliminate-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('eliminate-total').textContent, 10) || 0,
            distribution: document.getElementById('eliminate-distribution').textContent
        }
    };

    // Structure the output data
    const outputData = {
        applicationName: document.getElementById('applicationName').textContent,
        initialTimePlacement,
        confirmedTimePlacement,
        answers: answersData,
        summary
    };

    // Send the data to the main process to save to a file
    ipcRenderer.send('save-answers-to-file', outputData);
}



// Populate the Confirmed TIME Placement based on the highest distribution in the summary table
function updateConfirmedTimePlacement() {
    const summary = {
        Tolerate: parseInt(document.getElementById('tolerate-distribution').textContent, 10),
        Invest: parseInt(document.getElementById('invest-distribution').textContent, 10),
        Replace: parseInt(document.getElementById('replace-distribution').textContent, 10),
        Eliminate: parseInt(document.getElementById('eliminate-distribution').textContent, 10)
    };

    const decidedStrategy = Object.keys(summary).reduce((a, b) => (summary[a] > summary[b] ? a : b));
    const confirmedPlacement = summary[decidedStrategy] >= 80 ? decidedStrategy : '-';
    
    document.getElementById('confirmedTimePlacement').textContent = confirmedPlacement;
}

// Update this function to call updateConfirmedTimePlacement after updating distributions
function updateDistribution(clientScore, totalScore, category) {
    const distribution = totalScore > 0 ? Math.round((clientScore / totalScore) * 100) : 0;
    const distributionCell = document.getElementById(`${category}-distribution`);
    const row = distributionCell.parentElement;

    distributionCell.textContent = `${distribution}%`;

    if (distribution >= 80) {
        row.style.backgroundColor = 'green';
        row.style.color = 'white';
    } else {
        row.style.backgroundColor = '';
        row.style.color = '';
    }

    updateConfirmedTimePlacement(); // Update Confirmed TIME Placement after each distribution update
}

// Event listener for the save button
document.getElementById('saveButton').addEventListener('click', saveToFile);

//Listener for the Explainer button

document.getElementById('explanationBtn').addEventListener('click', () => {
    ipcRenderer.send('open-calculations-explained');
});

// Listen for the distribution threshold sent from the main process
ipcRenderer.on('set-distribution-threshold', (event, distributionThreshold) => {
    const thresholdElement = document.getElementById('distribution-threshold');
    if (thresholdElement) {
        thresholdElement.textContent = distributionThreshold;
    }
});


// Function to save answers, notes, and summary outcomes to an external file
function saveToFile() {
    const initialTimePlacement = document.getElementById('initialTimePlacement').value;
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement').textContent;

    const answersData = strategyQuestions.map(row => ({
        time: row.time,
        characteristics: row.characteristics,
        clientAnswer: row.clientAnswer,
        clientScore: row.clientScore,
        weight: row.weight,
        question: row.question,
        category: row.category,
        extendedAnswer: row.extendedAnswer,
        sampleDrivers: row.sampleDrivers
    }));

    const summary = {
        tolerate: {
            score: parseInt(document.getElementById('tolerate-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('tolerate-total').textContent, 10) || 0,
            distribution: document.getElementById('tolerate-distribution').textContent
        },
        invest: {
            score: parseInt(document.getElementById('invest-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('invest-total').textContent, 10) || 0,
            distribution: document.getElementById('invest-distribution').textContent
        },
        Replace: {
            score: parseInt(document.getElementById('replace-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('replace-total').textContent, 10) || 0,
            distribution: document.getElementById('replace-distribution').textContent
        },
        eliminate: {
            score: parseInt(document.getElementById('eliminate-client-score').textContent, 10) || 0,
            total: parseInt(document.getElementById('eliminate-total').textContent, 10) || 0,
            distribution: document.getElementById('eliminate-distribution').textContent
        }
    };

    const outputData = {
        applicationName: document.getElementById('applicationName').textContent,
        initialTimePlacement,
        confirmedTimePlacement,
        answers: answersData,
        summary
    };

    // Send the data to the main process to save to a file
    ipcRenderer.send('save-answers-to-file', outputData);
}
// Function to update the answered questions counter
function updateAnsweredQuestionsCounter() {
    answeredQuestions = strategyQuestions.filter(q => q.clientAnswer !== '-').length; // Count answered questions
    const counterElement = document.getElementById('questionsAnsweredCounter');
    counterElement.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`; // Update the counter display
}


// Initial table population and loading JSON data
loadStrategyQuestions();

