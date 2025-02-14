const { ipcRenderer } = require('electron');

// Global variable to store strategy questions
let strategyQuestions = [];

// Initialize global variables for answered questions and total questions
let totalQuestions = 0;
let answeredQuestions = 0;

let distributionThreshold = 80; // Default threshold, if not found in JSON

async function loadStrategyQuestions() {
    try {
        const response = await fetch('questions.json'); // Assuming questions.json is in the same directory
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("Strategy questions loaded:", data);

        // Extract and set the threshold
        if (data.length > 0 && data[0].config && data[0].config.distributionThreshold) {
            distributionThreshold = data[0].config.distributionThreshold;
        }

        strategyQuestions = data; // Store the rest of the data as strategy questions
        totalQuestions = strategyQuestions.length; // Set total number of questions
        populateStrategyQuestionsTable(); // Populate the table
        updateAnsweredQuestionsCounter(); // Update counter
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
        
        // Create cells for each column
        const cells = [
            row.time,
            row.characteristics,
            createAnswerSelect(row), // Special handling for answer dropdown
            row.clientScore || 0,
            row.weight,
            row.question,
            row.category,
            createExtendedAnswerInput(row), // Special handling for extended answer
            row.sampleDrivers
        ];

        cells.forEach((cell, i) => {
            const td = document.createElement('td');
            if (i === 2) { // Client Answer column
                td.appendChild(cell); // Append the select element
            } else if (i === 7) { // Extended Answer column
                td.appendChild(cell); // Append the input element
            } else {
                td.textContent = cell;
            }
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });

    updateClientScores();
    updateCompletionStatus();
}

// Helper function to create answer select with proper event handling
function createAnswerSelect(row) {
    const select = document.createElement('select');
    const options = ['-', 'No', 'Partial/Unsure', 'Yes'];
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === row.clientAnswer) {
            optionElement.selected = true;
        }
        select.appendChild(optionElement);
    });

    select.addEventListener('change', (event) => {
        row.clientAnswer = event.target.value;
        row.clientScore = calculateClientScore(row.clientAnswer, row.weight);
        
        // Update the client score in the next cell
        const scoreCell = event.target.parentElement.nextElementSibling;
        if (scoreCell) {
            scoreCell.textContent = row.clientScore;
        }

        updateClientScores();
        updateCompletionStatus();
    });

    return select;
}

// Helper function to create extended answer input
function createExtendedAnswerInput(row) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = row.extendedAnswer || '';
    input.addEventListener('change', (event) => {
        row.extendedAnswer = event.target.value;
        saveUpdatedStrategyQuestions();
    });
    return input;
}

// Function to dynamically generate category buttons
function generateCategoryButtons() {
    // Extract unique categories from strategyQuestions
    const categories = [...new Set(strategyQuestions.map(q => q.category))];
    const container = document.getElementById('categoryButtonsContainer');
    if (!container) {
        console.error('Category buttons container not found!');
        return;
    }
    container.innerHTML = ''; // Clear any existing buttons

    categories.forEach(category => {
        // Create a button for each category
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category;

        // Event listener to filter table based on clicked category
        button.addEventListener('click', () => {
            // Remove active state from all buttons
            document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.reset-button')?.classList.remove('active');

            // Add active state to the clicked button
            button.classList.add('active');

            // Filter the questions table by the selected category
            filterByCategory(category);
        });

        container.appendChild(button);
    });

    // Add reset button to clear filters
    const resetButton = document.createElement('button');
    resetButton.className = 'category-button reset-button';
    resetButton.textContent = 'Reset Filters';
    resetButton.addEventListener('click', () => {
        resetTable();
        // Remove active state from all category buttons
        document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active'));
        // Add active state to reset button
        resetButton.classList.add('active');
    });
    container.appendChild(resetButton);
}

// Function to filter the questions table by category
function filterByCategory(category) {
    const rows = document.querySelectorAll('#strategyQuestionsTable tbody tr');
    rows.forEach(row => {
        const categoryCell = row.querySelector('td:nth-child(7)'); // Assuming category is the 7th column
        if (categoryCell.textContent.trim().toLowerCase() === category.toLowerCase()) {
            row.style.display = ''; // Show rows that match the category
        } else {
            row.style.display = 'none'; // Hide rows that don't match
        }
    });
}

// Function to reset the table to show all rows
function resetTable() {
    document.querySelectorAll('#strategyQuestionsTable tbody tr').forEach(row => {
        row.style.display = ''; // Show all rows
    });
}

// Call generateCategoryButtons after loading the questions data
loadStrategyQuestions().then(() => {
    generateCategoryButtons();
});


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
    weight = parseInt(weight) || 0;
    if (clientAnswer === 'Yes') {
        return weight;
    } else if (clientAnswer === 'No') {
        return 0;
    } else if (clientAnswer === 'Partial/Unsure') {
        return Math.round(weight / 2);
    }
    return 0;  // Default to 0 if the answer is empty or invalid
}

// Update Client Scores in the summary table
function updateClientScores() {
    let scores = {
        tolerate: { score: 0, total: 0 },
        invest: { score: 0, total: 0 },
        replace: { score: 0, total: 0 },
        eliminate: { score: 0, total: 0 }
    };

    // Calculate scores
    strategyQuestions.forEach(row => {
        const category = row.time.toLowerCase();
        if (scores[category]) {
            const weight = parseInt(row.weight) || 0;
            scores[category].score += parseInt(row.clientScore) || 0;
            scores[category].total += weight; // Add weight to total regardless of answer
        }
    });

    // Calculate distributions and find max
    let maxDistribution = 0;
    let maxCategory = '';
    
    Object.entries(scores).forEach(([category, data]) => {
        // Ensure we're working with integers
        const score = parseInt(data.score) || 0;
        const total = parseInt(data.total) || 0;
        // Calculate distribution as a percentage
        const distribution = total > 0 ? Math.round((score / total) * 100) : 0;
        
        if (distribution > maxDistribution) {
            maxDistribution = distribution;
            maxCategory = category;
        }
    });

    // Update summary table
    const summaryTableBody = document.querySelector('#summaryTable tbody');
    summaryTableBody.innerHTML = ''; // Clear existing rows

    Object.entries(scores).forEach(([category, data]) => {
        const score = parseInt(data.score) || 0;
        const total = parseInt(data.total) || 0;
        const distribution = total > 0 ? Math.round((score / total) * 100) : 0;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${category.charAt(0).toUpperCase() + category.slice(1)}</td>
            <td>${score}</td>
            <td>${total}</td>
            <td class="distribution-column">${distribution}%</td>
        `;

        // Apply highlighting if distribution meets threshold
        if (distribution >= distributionThreshold) {
            row.style.backgroundColor = '#28a745';
            row.style.color = 'white';
        }

        summaryTableBody.appendChild(row);
    });

    // Update confirmed placement
    const confirmedPlacementElement = document.getElementById('confirmedTimePlacement');
    if (confirmedPlacementElement) {
        if (maxDistribution >= distributionThreshold) {
            const displayCategory = maxCategory.charAt(0).toUpperCase() + maxCategory.slice(1);
            confirmedPlacementElement.textContent = displayCategory;
            confirmedPlacementElement.style.backgroundColor = '#d2ebd2';
            confirmedPlacementElement.style.color = '#357a38';
            confirmedPlacementElement.style.borderColor = '#357a38';
            confirmedPlacementElement.classList.remove('below-threshold');
        } else {
            confirmedPlacementElement.textContent = `Below Threshold (${maxDistribution}%)`;
            confirmedPlacementElement.style.backgroundColor = '#fff3cd';
            confirmedPlacementElement.style.color = '#856404';
            confirmedPlacementElement.style.borderColor = '#ffeeba';
            confirmedPlacementElement.classList.add('below-threshold');
        }
    }
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
    const appName = document.getElementById('applicationName').textContent;

    // Get restart history for this application
    const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
    const appRestarts = restartHistory[appName] || [];

    // Calculate scores and distributions
    let scores = {
        tolerate: { score: 0, total: 0 },
        invest: { score: 0, total: 0 },
        replace: { score: 0, total: 0 },
        eliminate: { score: 0, total: 0 }
    };

    // Calculate scores
    strategyQuestions.forEach(row => {
        const category = row.time.toLowerCase();
        if (scores[category]) {
            scores[category].score += row.clientScore || 0;
            scores[category].total += row.weight || 0;
        }
    });

    // Calculate distributions
    Object.entries(scores).forEach(([category, data]) => {
        data.distribution = data.total > 0 ? Math.round((data.score / data.total) * 100) + '%' : '0%';
    });

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

    const outputData = {
        applicationName: appName,
        initialTimePlacement,
        confirmedTimePlacement,
        answers: answersData,
        summary: scores,
        assessmentHistory: {
            restarts: appRestarts,
            hasBeenRestarted: appRestarts.length > 0,
            totalRestarts: appRestarts.length,
            lastRestartDate: appRestarts.length > 0 ? appRestarts[appRestarts.length - 1] : null
        }
    };

    // Send the data to the main process to save to a file
    ipcRenderer.send('save-answers-to-file', outputData);
}



// Populate the Confirmed TIME Placement based on the highest distribution in the summary table
function updateConfirmedTimePlacement() {
    const summary = {
        Tolerate: parseInt(document.getElementById('tolerate-distribution').textContent, 10) || 0,
        Invest: parseInt(document.getElementById('invest-distribution').textContent, 10) || 0,
        Replace: parseInt(document.getElementById('replace-distribution').textContent, 10) || 0,
        Eliminate: parseInt(document.getElementById('eliminate-distribution').textContent, 10) || 0
    };

    const maxDistribution = Math.max(...Object.values(summary));
    const decidedStrategy = Object.keys(summary).find(key => summary[key] === maxDistribution);
    const confirmedPlacement = maxDistribution >= distributionThreshold
        ? decidedStrategy
        : `Below Threshold (${distributionThreshold}%)`;

    document.getElementById('confirmedTimePlacement').textContent = confirmedPlacement;
}


// Update this function to call updateConfirmedTimePlacement after updating distributions
function updateDistribution(clientScore, totalScore, category) {
    const distribution = totalScore > 0 ? Math.round((clientScore / totalScore) * 100) : 0;
    const distributionCell = document.getElementById(`${category}-distribution`);
    const row = distributionCell.parentElement;

    // Update distribution percentage
    distributionCell.textContent = `${distribution}%`;

    // Conditional formatting based on dynamic threshold
    if (distribution >= distributionThreshold) {
        row.style.backgroundColor = 'green';
        row.style.color = 'white';
    } else {
        row.style.backgroundColor = ''; // Reset to default
        row.style.color = '';          // Reset text color
    }

    updateConfirmedTimePlacement(); // Update confirmed placement
}

// Event listener for the save button
document.getElementById('saveButton').addEventListener('click', saveToFile);

// Event listener for the explanation button
document.getElementById('explanationBtn').addEventListener('click', () => {
    // Create and show the explanation window
    const explanationWindow = window.open('', 'Calculations Explained', 'width=600,height=400');
    
    // Generate the explanation content
    const explanationContent = `
        <html>
        <head>
            <title>Calculations Explained</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    line-height: 1.6;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1, h2 { color: #0F192E; }
                .section { margin-bottom: 20px; }
                .formula { 
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .note {
                    background: #fff3cd;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <h1>TIRE Calculations Explained</h1>
            
            <div class="section">
                <h2>Score Calculation</h2>
                <p>Each question's score is calculated based on the answer and weight:</p>
                <div class="formula">
                    <strong>Yes:</strong> Full weight value<br>
                    <strong>Partial/Unsure:</strong> Half of weight value (rounded)<br>
                    <strong>No:</strong> 0 points
                </div>
            </div>
            
            <div class="section">
                <h2>Distribution Calculation</h2>
                <p>For each TIRE category (Tolerate, Invest, Replace, Eliminate):</p>
                <div class="formula">
                    Distribution = (Total Client Score / Total Possible Score) × 100%
                </div>
            </div>
            
            <div class="section">
                <h2>TIRE Placement</h2>
                <p>The confirmed TIRE placement is determined by:</p>
                <ol>
                    <li>Calculating distribution for each category</li>
                    <li>Finding the category with the highest distribution</li>
                    <li>Checking if the highest distribution meets or exceeds the threshold (${distributionThreshold}%)</li>
                </ol>
                <div class="note">
                    If no category meets the threshold, the result will show as "Below Threshold"
                </div>
            </div>
            
            <div class="section">
                <h2>Weight Scale</h2>
                <p>Questions are weighted on a scale of 1-5:</p>
                <ul>
                    <li>1: Lowest importance</li>
                    <li>5: Highest importance</li>
                </ul>
            </div>
        </body>
        </html>
    `;
    
    // Write the content to the window
    explanationWindow.document.write(explanationContent);
    explanationWindow.document.close();
});

// Listen for the distribution threshold sent from the main process
ipcRenderer.on('set-distribution-threshold', (event, distributionThreshold) => {
    const thresholdElement = document.getElementById('distribution-threshold');
    if (thresholdElement) {
        thresholdElement.textContent = distributionThreshold;
    }
});


// Function to update the answered questions counter
function updateAnsweredQuestionsCounter() {
    answeredQuestions = strategyQuestions.filter(q => q.clientAnswer !== '-').length; // Count answered questions
    const counterElement = document.getElementById('questionsAnsweredCounter');
    counterElement.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`; // Update the counter display
}




// Initial table population and loading JSON data
loadStrategyQuestions();

// Load previous answers if they exist
async function loadPreviousAnswers(appName) {
    const appData = await ipcRenderer.invoke('get-app-data', appName);
    if (appData) {
        // Update completion status and date
        const completionHeader = document.getElementById('completionStatus');
        completionHeader.classList.remove('incomplete');
        const completionDate = new Date(appData.completedOn).toLocaleDateString();
        
        // Update completion text with restart information if available
        let completionText = `40 / 40 questions answered`;
        if (appData.assessmentHistory?.hasBeenRestarted) {
            completionText += ` (Restarted ${appData.assessmentHistory.totalRestarts} time${appData.assessmentHistory.totalRestarts > 1 ? 's' : ''})`;
        }
        document.getElementById('completionText').textContent = completionText;
        
        // Show completion date and last restart date if applicable
        let dateText = `Completed on ${completionDate}`;
        if (appData.assessmentHistory?.lastRestartDate) {
            const lastRestartDate = new Date(appData.assessmentHistory.lastRestartDate).toLocaleDateString();
            dateText += ` (Last restarted on ${lastRestartDate})`;
        }
        document.getElementById('completionDate').textContent = dateText;
        
        completionHeader.style.backgroundColor = '#fff3cd';

        // Load restart history into localStorage to maintain state
        if (appData.assessmentHistory?.restarts) {
            const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
            restartHistory[appName] = appData.assessmentHistory.restarts;
            localStorage.setItem('restartHistory', JSON.stringify(restartHistory));
        }

        // Set initial TIRE placement
        const initialPlacementSelect = document.getElementById('initialTimePlacement');
        initialPlacementSelect.value = appData.initialTIREPlacement;
        initialPlacementSelect.disabled = true;
        
        // Set confirmed TIRE placement with styling
        const confirmedPlacement = document.getElementById('confirmedTimePlacement');
        confirmedPlacement.textContent = appData.confirmedTIREPlacement;
        if (!appData.confirmedTIREPlacement.includes('Below Threshold')) {
            confirmedPlacement.style.backgroundColor = '#d2ebd2';
            confirmedPlacement.style.color = '#357a38';
            confirmedPlacement.style.borderColor = '#357a38';
        } else {
            confirmedPlacement.style.backgroundColor = '#fff3cd';
            confirmedPlacement.style.color = '#856404';
            confirmedPlacement.style.borderColor = '#ffeeba';
        }

        // Update distribution threshold display
        const thresholdElement = document.getElementById('distribution-threshold');
        if (thresholdElement) {
            thresholdElement.textContent = distributionThreshold;
        }

        // First, load the questions template
        await loadStrategyQuestions();

        // Then update with saved answers
        if (appData.answers) {
            strategyQuestions = appData.answers;
            populateStrategyQuestionsTable();

            // Disable all inputs after populating
            document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
                element.disabled = true;
            });
        }

        // Update summary table with the saved summary data
        if (appData.summary) {
            const summaryTable = document.getElementById('summaryTable').querySelector('tbody');
            summaryTable.innerHTML = '';

            Object.entries(appData.summary).forEach(([category, data]) => {
                const row = document.createElement('tr');
                const distribution = parseInt(data.distribution);
                
                row.innerHTML = `
                    <td>${category.charAt(0).toUpperCase() + category.slice(1)}</td>
                    <td>${data.score}</td>
                    <td>${data.total}</td>
                    <td class="distribution-column">${data.distribution}</td>
                `;

                // Apply highlighting if distribution meets threshold
                if (distribution >= distributionThreshold) {
                    row.style.backgroundColor = '#28a745';
                    row.style.color = 'white';
                }

                summaryTable.appendChild(row);
            });
        }

        // Show restart button and hide save button in view mode
        const saveButton = document.getElementById('saveButton');
        const restartButton = document.getElementById('restartBtn');
        if (saveButton) {
            saveButton.style.display = 'none';
        }
        if (restartButton) {
            restartButton.style.display = 'inline-block';
        }

        // Generate and disable category buttons
        generateCategoryButtons();
        document.querySelectorAll('.category-button').forEach(button => {
            button.classList.add('view-mode');
        });
    }
}

// Update the summary table
function updateSummaryTable(summary) {
    const summaryTable = document.getElementById('summaryTable').querySelector('tbody');
    summaryTable.innerHTML = '';

    const categories = ['Tolerate', 'Invest', 'Replace', 'Eliminate'];
    categories.forEach(category => {
        const row = document.createElement('tr');
        const lowerCategory = category.toLowerCase();
        const data = summary[lowerCategory];

        row.innerHTML = `
            <td>${category}</td>
            <td>${data.score}</td>
            <td>${data.total}</td>
            <td class="distribution-column">${data.distribution}</td>
        `;
        summaryTable.appendChild(row);
    });
}

// Update completion status and questions counter
function updateCompletionStatus() {
    const totalQuestions = strategyQuestions.length;
    const answeredQuestions = strategyQuestions.filter(q => q.clientAnswer && q.clientAnswer !== '-').length;
    
    // Update the counter in the yellow banner
    const completionText = document.getElementById('completionText');
    if (completionText) {
        completionText.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`;
    }

    // Update the completion header styling
    const completionHeader = document.getElementById('completionStatus');
    if (completionHeader) {
        if (answeredQuestions === totalQuestions) {
            completionHeader.classList.remove('incomplete');
        } else {
            completionHeader.classList.add('incomplete');
        }
    }
}

// Add event listener for application name
ipcRenderer.on('set-application-name', async (event, appName) => {
    document.getElementById('applicationName').textContent = appName;
    await loadPreviousAnswers(appName);
});

// Add change event listeners to all answer selects
document.addEventListener('change', event => {
    if (event.target.matches('select')) {
        updateCompletionStatus();
    }
});

// Function to show the confirmation modal
function showConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    modal.classList.add('show');
}

// Function to hide the confirmation modal
function hideConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    modal.classList.remove('show');
}

// Function to restart assessment
function restartAssessment() {
    // Add restart timestamp
    const restartTimestamp = new Date().toISOString();
    const appName = document.getElementById('applicationName').textContent;
    
    // Store restart information in localStorage
    const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
    if (!restartHistory[appName]) {
        restartHistory[appName] = [];
    }
    restartHistory[appName].push(restartTimestamp);
    localStorage.setItem('restartHistory', JSON.stringify(restartHistory));

    // Re-enable all inputs
    document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
        element.disabled = false;
    });

    // Re-enable initial TIRE placement
    const initialPlacementSelect = document.getElementById('initialTimePlacement');
    initialPlacementSelect.disabled = false;

    // Show save button
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.style.display = 'inline-block';
    }

    // Hide restart button
    const restartButton = document.getElementById('restartBtn');
    if (restartButton) {
        restartButton.style.display = 'none';
    }

    // Update completion header
    const completionHeader = document.getElementById('completionStatus');
    if (completionHeader) {
        completionHeader.style.backgroundColor = '#fff3cd';
        document.getElementById('completionDate').textContent = `Assessment Restarted on ${new Date(restartTimestamp).toLocaleDateString()}`;
    }

    // Remove view-mode class from category buttons
    document.querySelectorAll('.category-button').forEach(button => {
        button.classList.remove('view-mode');
    });

    // Hide the confirmation modal
    hideConfirmationModal();
}

// Add event listeners for modal interaction
document.addEventListener('DOMContentLoaded', () => {
    // Restart button shows the confirmation modal
    const restartButton = document.getElementById('restartBtn');
    if (restartButton) {
        restartButton.addEventListener('click', showConfirmationModal);
    }

    // Cancel button hides the modal
    const cancelButton = document.getElementById('cancelRestartBtn');
    if (cancelButton) {
        cancelButton.addEventListener('click', hideConfirmationModal);
    }

    // Confirm button triggers the restart
    const confirmButton = document.getElementById('confirmRestartBtn');
    if (confirmButton) {
        confirmButton.addEventListener('click', restartAssessment);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                hideConfirmationModal();
            }
        });
    }
});

