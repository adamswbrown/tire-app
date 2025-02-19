const { ipcRenderer } = require('electron');

// Logging utility
const logger = {
    logToFile: async function(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data ? JSON.stringify(data) : null
        };
        
        await ipcRenderer.invoke('write-to-log', logEntry);
        
        // Also log to console
        const consoleMsg = `${timestamp} [${level}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
        switch(level.toLowerCase()) {
            case 'error':
                console.error(consoleMsg);
                break;
            case 'warn':
                console.warn(consoleMsg);
                break;
            default:
                console.log(consoleMsg);
        }
    },
    
    info: function(message, data = null) {
        this.logToFile('INFO', message, data);
    },
    
    warn: function(message, data = null) {
        this.logToFile('WARN', message, data);
    },
    
    error: function(message, data = null) {
        this.logToFile('ERROR', message, data);
    },
    
    debug: function(message, data = null) {
        this.logToFile('DEBUG', message, data);
    }
};

// Global variable to store strategy questions
let strategyQuestions = [];

// Initialize global variables for answered questions and total questions
let totalQuestions = 0;
let answeredQuestions = 0;

let distributionThreshold = 80; // Default threshold, if not found in JSON
let tiebreakThreshold = 3; // Default threshold for considering scores as ties

// Listen for application name when opening strategy questions window
ipcRenderer.on('set-application-name', (event, appName) => {
    console.log("Received application name:", appName);
    // Update the application name in the header
    const appNameElement = document.getElementById('applicationName');
    if (appNameElement) {
        appNameElement.textContent = appName;
        // Trigger loading process after setting the name
        loadStrategyQuestions();
    } else {
        console.error("Could not find applicationName element");
    }
});

async function loadStrategyQuestions() {
    try {
        // Get the application name from the header
        const appNameElement = document.getElementById('applicationName');
        const applicationName = appNameElement ? appNameElement.textContent : null;

        if (!applicationName || applicationName === "Application Name") {
            console.error("Application name not set properly");
            return;
        }

        console.log("Loading questions for application:", applicationName);

        // Load template questions
        const response = await fetch('questions.json');
        const templateData = await response.json();
        
        // Get thresholds from the first question's config
        if (templateData[0] && templateData[0].config) {
            distributionThreshold = templateData[0].config.distributionThreshold || 80;
            tiebreakThreshold = templateData[0].config.tiebreakThreshold || 3;
            
            // Update threshold displays immediately after loading
            const thresholdElement = document.getElementById('distribution-threshold');
            const tiebreakElement = document.getElementById('tiebreaker-threshold');
            if (thresholdElement) {
                thresholdElement.textContent = distributionThreshold;
            }
            if (tiebreakElement) {
                tiebreakElement.textContent = tiebreakThreshold;
            }
        }

        // If we have an application name, try to load saved data
        if (applicationName && applicationName !== "Application Name") {
            console.log("Attempting to load saved data for application:", applicationName);
            const savedData = await ipcRenderer.invoke('get-app-data', applicationName);
            console.log("Saved data loaded:", savedData);

            if (savedData) {
                // Load restart and treatment histories into localStorage
                if (savedData.assessmentHistory?.restarts) {
                    const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
                    restartHistory[applicationName] = savedData.assessmentHistory.restarts;
                    localStorage.setItem('restartHistory', JSON.stringify(restartHistory));
                }

                if (savedData.treatmentHistory) {
                    const treatmentHistory = JSON.parse(localStorage.getItem('treatmentHistory') || '{}');
                    treatmentHistory[applicationName] = savedData.treatmentHistory;
                    localStorage.setItem('treatmentHistory', JSON.stringify(treatmentHistory));
                }

                // Set assessment state based on history
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    // Check if it's a completed assessment (has valid confirmed placement)
                    const isValidPlacement = savedData.confirmedTimePlacement && 
                                          savedData.confirmedTimePlacement !== "Not Set" && 
                                          savedData.confirmedTimePlacement !== "-" && 
                                          !savedData.confirmedTimePlacement.includes('Below Threshold');

                    if (isValidPlacement) {
                        // Mark as completed if not currently being restarted
                        if (!savedData.assessmentHistory?.hasBeenRestarted) {
                            mainContent.classList.add('assessment-completed');
                            console.log('Setting assessment-completed class for previously completed assessment');
                            
                            // Disable all inputs for completed assessments
                            document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
                                element.disabled = true;
                            });
                            
                            // Disable initial TIRE placement
                            const initialTimePlacement = document.getElementById('initialTimePlacement');
                            if (initialTimePlacement) {
                                initialTimePlacement.disabled = true;
                            }

                            // Show restart button, hide save button
                            const restartButton = document.getElementById('restartBtn');
                            const saveButton = document.getElementById('saveButton');
                            if (restartButton) restartButton.style.display = 'inline-block';
                            if (saveButton) saveButton.style.display = 'none';
                        }
                    }
                    
                    // Handle restart state if applicable
                    if (savedData.assessmentHistory?.hasBeenRestarted) {
                        mainContent.classList.remove('assessment-completed');
                        mainContent.classList.add('assessment-restarted');
                        console.log('Setting assessment-restarted class');
                        
                        // Enable all inputs for restarted assessments
                        document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
                            element.disabled = false;
                        });
                        
                        // Enable initial TIRE placement
                        const initialTimePlacement = document.getElementById('initialTimePlacement');
                        if (initialTimePlacement) {
                            initialTimePlacement.disabled = false;
                        }

                        // Show save button, hide restart button
                        const restartButton = document.getElementById('restartBtn');
                        const saveButton = document.getElementById('saveButton');
                        if (restartButton) restartButton.style.display = 'none';
                        if (saveButton) {
                            saveButton.style.display = 'inline-block';
                            saveButton.disabled = false;
                        }
                    }
                }

                // Load saved answers and other data
                if (savedData.answers) {
                    console.log("Found", savedData.answers.length, "saved answers");
                    let matchedCount = 0;

                    // Merge saved answers with template questions
                    templateData.forEach(templateQuestion => {
                        const savedAnswer = savedData.answers.find(answer => {
                            const templateQuestionText = templateQuestion.question.trim().toLowerCase();
                            const savedQuestionText = answer.question.trim().toLowerCase();
                            const templateTime = templateQuestion.time.trim().toLowerCase();
                            const savedTime = answer.time.trim().toLowerCase();
                            
                            const isMatch = templateQuestionText === savedQuestionText && templateTime === savedTime;
                            return isMatch;
                        });

                        if (savedAnswer) {
                            console.log("Matched answer for question:", templateQuestion.question);
                            templateQuestion.clientAnswer = savedAnswer.clientAnswer;
                            templateQuestion.clientScore = savedAnswer.clientScore;
                            templateQuestion.extendedAnswer = savedAnswer.extendedAnswer;
                            matchedCount++;
                        }
                    });

                    console.log("Total matched answers:", matchedCount);

                    // Set Initial TIRE Placement
                    if (savedData.initialTimePlacement) {
                        const initialPlacementSelect = document.getElementById('initialTimePlacement');
                        if (initialPlacementSelect) {
                            initialPlacementSelect.value = savedData.initialTimePlacement;
                        }
                    }

                    // Update confirmed TIRE placement if it exists
                    if (savedData.confirmedTimePlacement) {
                        const confirmedPlacementDiv = document.getElementById('confirmedTimePlacement');
                        if (confirmedPlacementDiv) {
                            confirmedPlacementDiv.textContent = savedData.confirmedTimePlacement;
                            // Add appropriate status class
                            updateConfirmedPlacement(savedData.confirmedTimePlacement);
                        }
                    }
                }
            }
        }

        strategyQuestions = templateData;
        totalQuestions = strategyQuestions.length;
        populateStrategyQuestionsTable();
        updateAnsweredQuestionsCounter();
        await updateClientScores();
        updateCompletionStatus();
    } catch (error) {
        console.error('Error loading strategy questions:', error);
        alert('Error loading strategy questions: ' + error.message);
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
            } else if (i === 3) { // Client Score column
                td.textContent = row.clientScore || 0; // Ensure score is displayed
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

    // Ensure the score is calculated and set
    if (row.clientAnswer && row.clientAnswer !== '-') {
        row.clientScore = calculateClientScore(row.clientAnswer, row.weight);
    }

    // For completed assessments, disable the select
    if (document.querySelector('.main-content')?.classList.contains('assessment-completed')) {
        select.disabled = true;
    }

    select.addEventListener('change', async (event) => {
        row.clientAnswer = event.target.value;
        row.clientScore = calculateClientScore(row.clientAnswer, row.weight);
        
        // Update the client score in the next cell
        const scoreCell = event.target.parentElement.nextElementSibling;
        if (scoreCell) {
            scoreCell.textContent = row.clientScore;
        }

        // Update the answered questions counter
        updateAnsweredQuestionsCounter();
        
        await updateClientScores();
        updateCompletionStatus();
        saveUpdatedStrategyQuestions();
    });

    return select;
}

// Helper function to create extended answer input
function createExtendedAnswerInput(row) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = row.extendedAnswer || '';
    
    // For completed assessments, disable the input
    if (document.querySelector('.main-content')?.classList.contains('assessment-completed')) {
        input.disabled = true;
    }
    
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
    // Count total questions
    totalQuestions = strategyQuestions.length;
    
    // Count answered questions (where clientAnswer is not '-' or empty)
    answeredQuestions = strategyQuestions.filter(q => 
        q.clientAnswer && 
        q.clientAnswer !== '-' && 
        q.clientAnswer !== ''
    ).length;
    
    // Update the counter display
    const counterElement = document.getElementById('completionText');
    const appNameElement = document.getElementById('applicationName');
    
    if (counterElement) {
        counterElement.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`;
        
        // Update completion status class
        const completionStatus = document.getElementById('completionStatus');
        if (completionStatus) {
            if (answeredQuestions === totalQuestions) {
                completionStatus.classList.remove('incomplete');
                completionStatus.classList.add('complete');
            } else {
                completionStatus.classList.remove('complete');
                completionStatus.classList.add('incomplete');
            }
        }
    }

    // Update save button state
    updateSaveButtonState();
}

// Helper function to calculate TIRE scores
function calculateTIREScores() {
    const scores = {
        Tolerate: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
        Invest: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
        Replace: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
        Eliminate: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 }
    };

    strategyQuestions.forEach(q => {
        const time = q.time;
        if (scores[time]) {
            scores[time].totalScore += q.clientScore || 0;
            scores[time].maxPossibleScore += parseInt(q.weight) || 0;
            if (q.clientAnswer && q.clientAnswer !== '-') {
                scores[time].answeredQuestions++;
            }
        }
    });

    // Calculate percentage scores
    Object.keys(scores).forEach(time => {
        const { totalScore, maxPossibleScore } = scores[time];
        scores[time].percentageScore = maxPossibleScore > 0 
            ? (totalScore / maxPossibleScore) * 100 
            : 0;
    });

    return scores;
}

function saveUpdatedStrategyQuestions() {
    // Get the application name
    const appNameElement = document.getElementById('applicationName');
    const applicationName = appNameElement ? appNameElement.textContent : null;

    if (!applicationName) {
        console.error('Cannot save: Application name not found');
        return;
    }

    // Get initial TIRE placement and validate it
    const initialTimePlacement = document.getElementById('initialTimePlacement').value;
    const validPlacements = ['Tolerate', 'Invest', 'Replace', 'Eliminate'];
    const validInitialPlacement = validPlacements.includes(initialTimePlacement) ? initialTimePlacement : 'Not Set';

    // Get confirmed TIRE placement
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement').textContent;

    // Check if assessment has been restarted
    const mainContent = document.querySelector('.main-content');
    const isRestarted = mainContent?.classList.contains('assessment-restarted');

    // Get restart and treatment histories
    const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
    const appRestartHistory = restartHistory[applicationName] || [];
    const treatmentHistory = JSON.parse(localStorage.getItem('treatmentHistory') || '{}');
    const appTreatmentHistory = treatmentHistory[applicationName] || [];

    // Create the output data object
    const outputData = {
        applicationName: applicationName,
        initialTimePlacement: validInitialPlacement,
        confirmedTimePlacement: confirmedTimePlacement,
        answers: strategyQuestions.map(q => ({
            time: q.time,
            question: q.question,
            category: q.category,
            clientAnswer: q.clientAnswer || '-',
            clientScore: q.clientScore || 0,
            extendedAnswer: q.extendedAnswer || ''
        })),
        summary: {
            totalQuestions: totalQuestions,
            answeredQuestions: answeredQuestions,
            tireScores: calculateTIREScores()
        },
        assessmentHistory: {
            restarts: appRestartHistory.map(r => ({
                date: r.date,
                reason: r.reason,
                treatmentAtRestart: r.treatmentAtRestart
            })),
            hasBeenRestarted: isRestarted,
            totalRestarts: appRestartHistory.length,
            lastRestartDate: appRestartHistory.length > 0 ? appRestartHistory[appRestartHistory.length - 1].date : null,
            lastRestartReason: appRestartHistory.length > 0 ? appRestartHistory[appRestartHistory.length - 1].reason : null
        },
        treatmentHistory: appTreatmentHistory.map(t => ({
            date: t.date,
            previousTreatment: t.previousTreatment,
            newTreatment: t.newTreatment,
            reason: t.reason,
            restartId: t.restartId
        }))
    };

    // Update in-memory state only
    console.log('Strategy questions state updated:', outputData);
}

// Helper function to calculate initial time placement
function calculateInitialTimePlacement() {
    const categoryScores = calculateCategoryScores();
    let highestScoreCategory = null;
    let highestScore = -1;
    let tiedCategories = [];

    // Find the highest scoring category
    Object.entries(categoryScores).forEach(([category, scores]) => {
        if (scores.percentageScore > highestScore) {
            highestScore = scores.percentageScore;
            highestScoreCategory = category;
            tiedCategories = [category];
        } else if (scores.percentageScore === highestScore) {
            tiedCategories.push(category);
        }
    });

    // If no category has a score above the distribution threshold, return "Not Set"
    if (highestScore < distributionThreshold) {
        return "Not Set";
    }

    // If there are tied categories within the tiebreak threshold
    if (tiedCategories.length > 1) {
        // Sort by total weight of answered questions
        tiedCategories.sort((a, b) => {
            const aWeight = strategyQuestions
                .filter(q => q.category === a && q.clientAnswer !== '-')
                .reduce((sum, q) => sum + (parseInt(q.weight) || 0), 0);
            const bWeight = strategyQuestions
                .filter(q => q.category === b && q.clientAnswer !== '-')
                .reduce((sum, q) => sum + (parseInt(q.weight) || 0), 0);
            return bWeight - aWeight;
        });
    }

    return tiedCategories[0] || "Not Set";
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

// Helper function to get temperature class based on percentage
function getTemperatureClass(percentage) {
    if (percentage >= 80) return 'temp-80-100';
    if (percentage >= 60) return 'temp-61-79';
    if (percentage >= 40) return 'temp-41-60';
    if (percentage >= 20) return 'temp-21-40';
    return 'temp-0-20';
}

// Update Client Scores in the summary table
async function updateClientScores() {
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
            scores[category].total += weight;
        }
    });

    // Calculate distributions and find categories above threshold
    let categoriesAboveThreshold = [];
    let maxDistribution = 0;
    let maxCategory = '';
    
    Object.entries(scores).forEach(([category, data]) => {
        const score = parseInt(data.score) || 0;
        const total = parseInt(data.total) || 0;
        const distribution = total > 0 ? Math.round((score / total) * 100) : 0;
        
        // Store distribution in the scores object
        scores[category].distribution = distribution;
        
        if (distribution >= distributionThreshold) {
            categoriesAboveThreshold.push({ category, distribution });
        }

        // Track the highest distribution
        if (distribution > maxDistribution) {
            maxDistribution = distribution;
            maxCategory = category;
        }
    });

    // Update summary table with new styling
    const summaryTableBody = document.querySelector('#summaryTable tbody');
    summaryTableBody.innerHTML = '';

    Object.entries(scores).forEach(([category, data]) => {
        const row = document.createElement('tr');
        const distribution = data.distribution;
        const temperatureClass = getTemperatureClass(distribution);
        
        row.className = temperatureClass;
        
        row.innerHTML = `
            <td>${category.charAt(0).toUpperCase() + category.slice(1)}</td>
            <td>${data.score}</td>
            <td>${data.total}</td>
            <td class="distribution-column">
                <div class="distribution-percentage">
                    <div class="distribution-bar" style="width: ${distribution}%"></div>
                    <span>${distribution}%</span>
                </div>
            </td>
        `;

        summaryTableBody.appendChild(row);
    });

    // Handle TIRE placement logic
    const confirmedPlacementElement = document.getElementById('confirmedTimePlacement');
    if (confirmedPlacementElement) {
        if (categoriesAboveThreshold.length === 0) {
            // No categories above threshold
            confirmedPlacementElement.textContent = `Below Threshold (${maxDistribution}%)`;
            confirmedPlacementElement.className = 'below-threshold';
        } else {
            // Sort categories by distribution
            categoriesAboveThreshold.sort((a, b) => b.distribution - a.distribution);
            
            // Find categories within tiebreaker threshold of the highest scoring category
            const tiebreakerCategories = categoriesAboveThreshold.filter(cat => 
                Math.abs(cat.distribution - categoriesAboveThreshold[0].distribution) <= tiebreakThreshold
            );

            if (tiebreakerCategories.length === 1) {
                // Single category above threshold or no ties within tiebreaker threshold
                updateConfirmedPlacement(tiebreakerCategories[0].category);
            } else {
                // Multiple categories within tiebreaker threshold
                confirmedPlacementElement.textContent = 'Multiple Placements';
                confirmedPlacementElement.className = 'status-pending';
            }
        }
    }

    // Update save button state at the end
    await updateSaveButtonState();
}

// Update this function to correctly check conditions and enable the save button
async function updateSaveButtonState() {
    const saveButton = document.getElementById('saveButton');
    const mainContent = document.querySelector('.main-content');
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement');
    const initialTimePlacement = document.getElementById('initialTimePlacement');
    
    if (!saveButton || !confirmedTimePlacement || !initialTimePlacement) {
        logger.error('Missing required elements for save button state update');
        return;
    }

    // For completed assessments, keep the button disabled
    if (mainContent.classList.contains('assessment-completed')) {
        saveButton.disabled = true;
        saveButton.title = 'Please restart the assessment to make changes';
        return;
    }

    // Get placement values
    const initialPlacement = initialTimePlacement.value;
    const confirmedPlacement = confirmedTimePlacement.textContent;
    
    // Check if initial placement is valid
    const isValidInitialPlacement = initialPlacement && 
                                  initialPlacement !== '' && 
                                  initialPlacement !== 'Not Set';

    // Check if confirmed placement is valid
    const isValidConfirmedPlacement = confirmedPlacement && 
                                    confirmedPlacement !== '' && 
                                    confirmedPlacement !== 'Not Set' && 
                                    confirmedPlacement !== '-' &&
                                    confirmedPlacement !== 'Multiple Placements' &&
                                    !confirmedPlacement.includes('Below Threshold');
    
    // Remove any existing classes that might affect the button state
    saveButton.classList.remove('disabled');
    
    // The save button should be disabled by default
    saveButton.disabled = true;

    // Set appropriate title message based on state
    if (!isValidInitialPlacement) {
        saveButton.title = 'Initial TIRE placement must be set before completing';
        return;
    }

    if (!isValidConfirmedPlacement) {
        // Check if we're in a tiebreaker scenario
        const scores = calculateTIREScores();
        const categoriesAboveThreshold = Object.entries(scores)
            .filter(([_, data]) => data.percentageScore >= distributionThreshold)
            .length;

        if (categoriesAboveThreshold > 1) {
            // In tiebreaker scenario
            saveButton.title = 'Please select a final placement from the tiebreaker options';
            return;
        }

        if (categoriesAboveThreshold === 0) {
            // No categories above threshold
            saveButton.title = 'No categories meet the threshold requirements';
            return;
        }

        saveButton.title = 'A valid confirmed TIRE placement is required before completing';
        return;
    }

    // If we get here, both placements are valid
    saveButton.disabled = false;
    saveButton.title = 'Click to complete the assessment';
    
    logger.debug('Save button state updated', {
        disabled: saveButton.disabled,
        title: saveButton.title,
        initialPlacement,
        confirmedPlacement,
        isValidInitial: isValidInitialPlacement,
        isValidConfirmed: isValidConfirmedPlacement
    });
}

function showCompletionModal(appName) {
    console.log('Showing completion modal for:', appName);
    const completionModal = document.getElementById('completionModal');
    const completionMessage = document.getElementById('completionMessage');
    if (completionModal && completionMessage) {
        completionMessage.innerHTML = `Congratulations! Your app <strong>${appName}</strong> has been completed and saved.<br><br>The application's answers can be updated at any time by Restarting the <strong>${appName}</strong> questionnaire.`;
        completionModal.style.display = 'block';
        completionModal.style.visibility = 'visible';
        completionModal.style.opacity = '1';
        completionModal.style.zIndex = '10000';
        completionModal.classList.add('show');
        
        // Add completed class to main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.add('assessment-completed');
        }

        // Update UI state
        updateCompletionStatus();
    } else {
        console.error('Completion modal elements not found:', {
            modal: !!completionModal,
            message: !!completionMessage
        });
    }
}

// Updated tiebreaker modal function that returns a Promise
function showTiebreakerModalWithPromise(categories) {
    logger.info('Creating tiebreaker modal for categories:', categories);
    return new Promise((resolve, reject) => {
        try {
            logger.debug('Building tiebreaker modal UI');
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'tiebreakerModal';
            modal.style.display = 'block';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.style.zIndex = '10000';
            
            logger.debug('Setting up modal content with categories:', 
                categories.map(c => `${c.category}: ${c.distribution}%`).join(', '));
            
            const modalContent = `
                <div class="modal-content" style="width: 80%; max-width: 600px; margin: 50px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin-bottom: 20px;">Multiple Categories Above Threshold</h2>
                    <p style="margin-bottom: 15px;">Multiple categories have met or exceeded the distribution threshold (${distributionThreshold}%) 
                       and are within the tiebreaker threshold of ${tiebreakThreshold}% of each other.</p>
                    
                    <div class="category-scores" style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px;">
                        ${categories.map(c => `
                            <div class="category-score" style="margin: 10px 0;">
                                <strong>${c.category}:</strong> ${c.distribution}%
                            </div>
                        `).join('')}
                    </div>

                    <p style="margin: 15px 0;">Please select the final TIRE placement:</p>
                    
                    <div class="category-buttons" style="display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0;">
                        ${categories.map(c => `
                            <button class="category-select-btn" data-category="${c.category}"
                                    style="padding: 10px 20px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; transition: background 0.3s;">
                                ${c.category}
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="tiebreaker-info" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 4px;">
                        <p><strong>Tiebreaker Rules:</strong></p>
                        <ul style="margin: 10px 0 0 20px;">
                            <li>Categories within ${tiebreakThreshold}% are considered ties</li>
                            <li>Initial TIRE placement is considered as a tiebreaker</li>
                        </ul>
                    </div>

                    <div class="modal-buttons" style="margin-top: 20px; text-align: right;">
                        <button class="go-back-btn" 
                                style="padding: 10px 20px; border: 1px solid #6c757d; border-radius: 4px; background: #6c757d; color: white; cursor: pointer;">
                            Go Back and Edit Answers
                        </button>
                    </div>
                </div>
            `;
            
            modal.innerHTML = modalContent;
            document.body.appendChild(modal);
            logger.info('Tiebreaker modal successfully created and added to document');

            // Add event listeners for category selection
            const buttons = modal.querySelectorAll('.category-select-btn');
            logger.debug(`Created ${buttons.length} category selection buttons`);
            
            buttons.forEach(button => {
                const category = button.dataset.category;
                logger.debug(`Adding event listeners for ${category} button`);
                
                button.addEventListener('click', () => {
                    const selectedCategory = button.dataset.category;
                    logger.info('User selected category:', selectedCategory);
                    modal.remove();
                    resolve(selectedCategory);
                });
            });

            // Add event listener for go back button
            const goBackBtn = modal.querySelector('.go-back-btn');
            goBackBtn.addEventListener('click', () => {
                logger.info('User clicked go back button');
                modal.remove();
                resolve('go-back');
            });

            // Close modal when clicking outside
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    logger.info('User clicked outside modal - treating as go back');
                    modal.remove();
                    resolve('go-back');
                }
            });
        } catch (error) {
            logger.error('Error creating tiebreaker modal:', error);
            reject(error);
        }
    });
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

// Function to update the completion status of the assessment
function updateCompletionStatus() {
    console.log('Updating completion status');
    const completionStatus = document.getElementById('completionStatus');
    const mainContent = document.querySelector('.main-content');
    const saveButton = document.getElementById('saveButton');
    const restartButton = document.getElementById('restartBtn');
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement');
    const initialTimePlacement = document.getElementById('initialTimePlacement');

    if (!completionStatus || !mainContent || !confirmedTimePlacement || !initialTimePlacement) {
        console.log('Missing required elements');
        return;
    }

    // Calculate completion percentage
    const percentageComplete = (answeredQuestions / totalQuestions) * 100;
    
    // Update completion status styling
    if (percentageComplete === 100) {
        completionStatus.classList.remove('incomplete');
        completionStatus.classList.add('complete');
    } else {
        completionStatus.classList.remove('complete');
        completionStatus.classList.add('incomplete');
    }

    // Check if assessment has been restarted
    const isRestarted = mainContent.classList.contains('assessment-restarted');
    // Check if assessment was previously completed (saved)
    const wasCompleted = mainContent.classList.contains('assessment-completed');

    // Get confirmed placement and check if it's valid
    const confirmedPlacement = confirmedTimePlacement.textContent;
    const initialPlacement = initialTimePlacement.value;
    const isValidConfirmedPlacement = confirmedPlacement && 
                                    confirmedPlacement !== 'Not Set' && 
                                    confirmedPlacement !== '-' &&
                                    !confirmedPlacement.includes('Below Threshold');
    const isValidInitialPlacement = initialPlacement && initialPlacement !== '';

    // Handle button visibility based on assessment state
    if (isRestarted) {
        // For restarted assessments, show save button
        if (restartButton) restartButton.style.display = 'none';
        if (saveButton) {
            saveButton.style.display = 'inline-block';
            saveButton.disabled = !isValidInitialPlacement;
        }
    } else if (wasCompleted) {
        // For completed (saved) assessments, show restart button
        if (restartButton) {
            restartButton.style.display = 'inline-block';
            restartButton.disabled = false;
        }
        if (saveButton) saveButton.style.display = 'none';
    } else {
        // New assessment or in progress
        if (restartButton) restartButton.style.display = 'none';
        if (saveButton) {
            saveButton.style.display = 'inline-block';
            saveButton.disabled = !isValidInitialPlacement;
        }
    }

    // Update input states - only disable if completed and not restarted
    const inputs = document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input');
    inputs.forEach(input => {
        input.disabled = wasCompleted && !isRestarted;
    });

    // Update initial TIRE placement state
    if (initialTimePlacement) {
        initialTimePlacement.disabled = wasCompleted && !isRestarted;
    }
}

// Add the missing initializeCalculationTabs function
function initializeCalculationTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        });
    });
}

// Update the DOMContentLoaded event listener to properly handle the restart button
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');

    // Generate category buttons immediately
    generateCategoryButtons();

    // Add calculations button event listener
    const explanationBtn = document.getElementById('explanationBtn');
    const calculationsModal = document.getElementById('calculationsModal');
    const closeCalculationsBtn = document.getElementById('closeCalculationsBtn');
    const restartBtn = document.getElementById('restartBtn');
    const confirmationModal = document.getElementById('confirmationModal');
    const cancelRestartBtn = document.getElementById('cancelRestartBtn');
    const confirmRestartBtn = document.getElementById('confirmRestartBtn');
    const saveButton = document.getElementById('saveButton');
    const completionModal = document.getElementById('completionModal');
    const completionOkBtn = document.getElementById('completionOkBtn');

    // Initialize calculation tabs
    initializeCalculationTabs();

    // Add Calculations Explained button event listener
    if (explanationBtn && calculationsModal) {
        explanationBtn.addEventListener('click', () => {
            calculationsModal.style.display = 'block';
            calculationsModal.style.visibility = 'visible';
            calculationsModal.style.opacity = '1';
            calculationsModal.style.zIndex = '10000';
            calculationsModal.classList.add('show');
        });
    }

    // Add close calculations modal button event listener
    if (closeCalculationsBtn && calculationsModal) {
        closeCalculationsBtn.addEventListener('click', () => {
            calculationsModal.style.display = 'none';
                calculationsModal.classList.remove('show');
        });

        // Close modal when clicking outside
        calculationsModal.addEventListener('click', (event) => {
            if (event.target === calculationsModal) {
                calculationsModal.style.display = 'none';
                calculationsModal.classList.remove('show');
            }
        });
    }

    // Add restart button event listener
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            console.log('Restart button clicked');
            if (confirmationModal) {
                // Reset the restart reason field
                document.getElementById('restartReason').value = '';
                
                // Show the modal with proper styling
                confirmationModal.style.display = 'block';
                confirmationModal.style.visibility = 'visible';
                confirmationModal.style.opacity = '1';
                confirmationModal.style.zIndex = '10000';
                confirmationModal.classList.add('show');
                
                // Focus the reason input
                document.getElementById('restartReason').focus();
            }
        });
    }

    if (cancelRestartBtn) {
        cancelRestartBtn.addEventListener('click', () => {
            if (confirmationModal) {
                confirmationModal.style.display = 'none';
                confirmationModal.classList.remove('show');
            }
        });
    }

    if (confirmRestartBtn) {
        confirmRestartBtn.addEventListener('click', async () => {
            const restartReason = document.getElementById('restartReason').value.trim();
            if (!restartReason) {
                alert('Please provide a reason for restarting the assessment.');
                return;
            }

            try {
                const restartTimestamp = new Date().toISOString();
                const appName = document.getElementById('applicationName').textContent;
                const currentTreatment = document.getElementById('confirmedTimePlacement').textContent;

                // Get existing restart history or initialize new one
                const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
                if (!restartHistory[appName]) {
                    restartHistory[appName] = [];
                }

                // Get existing treatment history or initialize new one
                const treatmentHistory = JSON.parse(localStorage.getItem('treatmentHistory') || '{}');
                if (!treatmentHistory[appName]) {
                    treatmentHistory[appName] = [];
                }

                // Add new restart entry
                restartHistory[appName].push({
                    date: restartTimestamp,
                    reason: restartReason,
                    treatmentAtRestart: currentTreatment
                });

                // Add new treatment change entry
                treatmentHistory[appName].push({
                    date: restartTimestamp,
                    previousTreatment: currentTreatment,
                    newTreatment: "Not Set", // Will be updated when new treatment is confirmed
                    reason: "Assessment Restarted",
                    restartId: restartHistory[appName].length // Link to the restart entry
                });

                // Save histories to localStorage
                localStorage.setItem('restartHistory', JSON.stringify(restartHistory));
                localStorage.setItem('treatmentHistory', JSON.stringify(treatmentHistory));

                // Store the current state in localStorage
                const currentState = {
                    applicationName: appName,
                    assessmentHistory: {
                        lastRestartDate: restartTimestamp,
                        lastRestartReason: restartReason,
                        hasBeenRestarted: true,
                        treatmentAtRestart: currentTreatment
                    },
                    outputData: {
                        applicationName: appName,
                        initialTimePlacement: document.getElementById('initialTimePlacement').value,
                        confirmedTimePlacement: document.getElementById('confirmedTimePlacement').textContent,
                        answers: strategyQuestions.map(q => ({
                            time: q.time,
                            question: q.question,
                            category: q.category,
                            clientAnswer: q.clientAnswer || '-',
                            clientScore: q.clientScore || 0,
                            extendedAnswer: q.extendedAnswer || ''
                        }))
                    }
                };

                localStorage.setItem(`appState_${appName}`, JSON.stringify(currentState));

                // Clear the restart reason input and close modal
                document.getElementById('restartReason').value = '';
                confirmationModal.style.display = 'none';
                confirmationModal.classList.remove('show');

                // Enable editing mode
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.classList.remove('assessment-completed');
                    mainContent.classList.add('assessment-restarted');
                }

                // Hide restart button and show save button
                const restartButton = document.getElementById('restartBtn');
                const saveButton = document.getElementById('saveButton');
                if (restartButton) {
                    restartButton.style.display = 'none';
                }
                if (saveButton) {
                    saveButton.style.display = 'inline-block';
                    saveButton.disabled = false;
                }

                // Enable all inputs without resetting their values
                document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
                    element.disabled = false;
                });
                
                // Enable initial TIRE placement
                const initialTimePlacement = document.getElementById('initialTimePlacement');
                if (initialTimePlacement) {
                    initialTimePlacement.disabled = false;
                }

                // Update UI state
                updateCompletionStatus();

            } catch (error) {
                console.error('Error during restart process:', error);
                alert('Failed to restart the assessment. Please try again.');
            }
        });
    }

    // Add save button event listener
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            logger.info('Save button clicked - starting save process');
            const confirmedPlacement = document.getElementById('confirmedTimePlacement').textContent;
            const isRestarted = document.querySelector('.main-content')?.classList.contains('assessment-restarted');
            
            // Calculate scores and find categories above threshold
            const scores = calculateTIREScores();
            logger.debug('Calculated TIRE scores', scores);
            
            const categoriesAboveThreshold = Object.entries(scores)
                .filter(([_, data]) => data.percentageScore >= distributionThreshold)
                .map(([category, data]) => ({
                    category: category,
                    distribution: Math.round(data.percentageScore)
                }))
                .sort((a, b) => b.distribution - a.distribution);

            logger.info(`Found ${categoriesAboveThreshold.length} categories above threshold (${distributionThreshold}%)`, categoriesAboveThreshold);

            // Tiebreaker logic
            if (categoriesAboveThreshold.length > 1) {
                logger.info('Multiple categories detected - initiating tiebreaker process');
                try {
                    logger.debug('Showing tiebreaker modal with categories', 
                        categoriesAboveThreshold.map(c => `${c.category}: ${c.distribution}%`).join(', '));
                    
                    const selectedCategory = await showTiebreakerModalWithPromise(categoriesAboveThreshold);
                    logger.info('User selected category from tiebreaker:', selectedCategory);
                    
                    if (selectedCategory === 'go-back') {
                        logger.info('User chose to go back - canceling save process');
                        return;
                    }
                    
                    if (selectedCategory) {
                        logger.info('Updating confirmed placement with selected category:', selectedCategory);
                        updateConfirmedPlacement(selectedCategory);
                        
                        logger.debug('Waiting for UI update');
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        const updatedPlacement = document.getElementById('confirmedTimePlacement').textContent;
                        logger.debug('Confirmed placement after update:', updatedPlacement);
                        
                        if (updatedPlacement === 'Multiple Placements' || !updatedPlacement) {
                            const error = 'Failed to update placement after tiebreaker selection';
                            logger.error(error);
                            throw new Error(error);
                        }
                    } else {
                        logger.info('No category selected - canceling save process');
                        return;
                    }
                } catch (error) {
                    logger.error('Error during tiebreaker handling:', error);
                    return;
                }
            } else if (categoriesAboveThreshold.length === 1) {
                logger.info('Single category above threshold - auto-selecting:', categoriesAboveThreshold[0].category);
                updateConfirmedPlacement(categoriesAboveThreshold[0].category);
            } else {
                logger.info('No categories above threshold - finding highest scoring category');
                const maxCategory = Object.entries(scores)
                    .reduce((max, [category, data]) => 
                        (!max || data.percentageScore > max.score) 
                            ? {category, score: data.percentageScore} 
                            : max
                    , null);
                
                if (maxCategory) {
                    logger.info(`Setting below threshold status with highest category: ${maxCategory.category} (${Math.round(maxCategory.score)}%)`);
                    document.getElementById('confirmedTimePlacement').textContent = 
                        `Below Threshold (${Math.round(maxCategory.score)}%)`;
                    document.getElementById('confirmedTimePlacement').className = 'below-threshold';
                }
            }

            // Proceed with saving...
            const appName = document.getElementById('applicationName').textContent;
            const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}')[appName] || [];
            const treatmentHistory = JSON.parse(localStorage.getItem('treatmentHistory') || '{}')[appName] || [];
            
            const outputData = {
                applicationName: appName,
                initialTimePlacement: document.getElementById('initialTimePlacement').value,
                confirmedTimePlacement: document.getElementById('confirmedTimePlacement').textContent,
                answers: strategyQuestions.map(q => ({
                    time: q.time,
                    question: q.question,
                    category: q.category,
                    clientAnswer: q.clientAnswer || '-',
                    clientScore: q.clientScore || 0,
                    extendedAnswer: q.extendedAnswer || ''
                })),
                summary: {
                    totalQuestions: totalQuestions,
                    answeredQuestions: answeredQuestions,
                    tireScores: calculateTIREScores()
                },
                assessmentHistory: {
                    hasBeenRestarted: false, // Reset restart state when saving
                    restarts: restartHistory.map(r => ({
                        date: r.date,
                        reason: r.reason,
                        treatmentAtRestart: r.treatmentAtRestart
                    })),
                    totalRestarts: restartHistory.length,
                    lastRestartDate: restartHistory.length > 0 ? restartHistory[restartHistory.length - 1].date : null,
                    lastRestartReason: restartHistory.length > 0 ? restartHistory[restartHistory.length - 1].reason : null
                },
                treatmentHistory: treatmentHistory.map(t => ({
                    date: t.date,
                    previousTreatment: t.previousTreatment,
                    newTreatment: t.newTreatment,
                    reason: t.reason,
                    restartId: t.restartId
                }))
            };

            // Save the assessment data
            ipcRenderer.send('save-answers-to-file', outputData);

            // Update UI state before showing completion modal
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.classList.remove('assessment-restarted');
                mainContent.classList.add('assessment-completed');
            }
            
            // Disable all inputs
            document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
                element.disabled = true;
            });
            
            // Disable initial TIRE placement
            const initialTimePlacement = document.getElementById('initialTimePlacement');
            if (initialTimePlacement) {
                initialTimePlacement.disabled = true;
            }
            
            // Update completion status to show restart button
            updateCompletionStatus();

            // Show completion modal
            showCompletionModal(appName);
        });
    }

    // Add completion modal OK button event listener
    if (completionOkBtn) {
        completionOkBtn.addEventListener('click', () => {
            if (completionModal) {
                completionModal.style.display = 'none';
                completionModal.classList.remove('show');
            }
        });
    }

    // ... rest of the existing event listeners ...
});

// Function to update the confirmed TIRE placement
function updateConfirmedPlacement(category) {
    const confirmedPlacementElement = document.getElementById('confirmedTimePlacement');
    if (!confirmedPlacementElement) return;

    // Capitalize the first letter of the category
    const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
    
    // Update the confirmed placement
    confirmedPlacementElement.textContent = formattedCategory;
    confirmedPlacementElement.className = ''; // Reset classes
    
    // Add styling based on the category
    switch (formattedCategory.toLowerCase()) {
        case 'tolerate':
            confirmedPlacementElement.classList.add('status-tolerate');
            break;
        case 'invest':
            confirmedPlacementElement.classList.add('status-invest');
            break;
        case 'replace':
            confirmedPlacementElement.classList.add('status-replace');
            break;
        case 'eliminate':
            confirmedPlacementElement.classList.add('status-eliminate');
            break;
        default:
            confirmedPlacementElement.classList.add('status-pending');
    }
}

