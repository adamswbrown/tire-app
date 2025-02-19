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
ipcRenderer.on('set-application-name', async (event, appName) => {
    logger.debug("Received application name:", appName);
    // Update the application name in the header
    const appNameElement = document.getElementById('applicationName');
    if (appNameElement) {
        appNameElement.textContent = appName;
        // Now that we have the app name, initialize the UI
        await initializeUI();
    } else {
        logger.error("Could not find applicationName element");
    }
});

async function loadStrategyQuestions() {
    try {
        // Get the application name from the header
        const appNameElement = document.getElementById('applicationName');
        const applicationName = appNameElement ? appNameElement.textContent : null;

        if (!applicationName || applicationName === "Application Name") {
            logger.error("Application name not set properly");
            return;
        }

        logger.info("Loading questions for application:", applicationName);

        // Load template questions
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`Failed to load questions.json: ${response.status} ${response.statusText}`);
        }
        
        const templateData = await response.json();
        logger.debug(`Loaded ${templateData.length} questions from template`);
        
        // Get thresholds from the first question's config
        if (templateData[0] && templateData[0].config) {
            distributionThreshold = templateData[0].config.distributionThreshold || 80;
            tiebreakThreshold = templateData[0].config.tiebreakThreshold || 3;
            
            logger.debug(`Set thresholds - Distribution: ${distributionThreshold}%, Tiebreak: ${tiebreakThreshold}%`);
            
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
            logger.debug("Attempting to load saved data for application:", applicationName);
            const savedData = await ipcRenderer.invoke('get-app-data', applicationName);
            logger.debug("Saved data loaded:", savedData);

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
        
        logger.debug(`Populated strategy questions table with ${totalQuestions} questions`);
        populateStrategyQuestionsTable();
        updateAnsweredQuestionsCounter();
        await updateClientScores();
        updateCompletionStatus();
        
        logger.info("Successfully loaded and initialized strategy questions");
        return true;
    } catch (error) {
        logger.error('Error loading strategy questions:', error);
        alert('Error loading strategy questions: ' + error.message);
        return false;
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
    logger.debug('Starting to generate category buttons');
    
    // Extract unique categories from strategyQuestions
    const categories = [...new Set(strategyQuestions.map(q => q.category))];
    logger.debug('Found categories:', categories);
    
    const container = document.getElementById('categoryButtonsContainer');
    if (!container) {
        logger.error('Category buttons container not found!');
        return;
    }
    
    // Clear any existing buttons
    container.innerHTML = '';
    
    // Create a button for each category
    categories.forEach(category => {
        if (!category) {
            logger.warn('Found empty category, skipping button creation');
            return;
        }
        
        const parts = category.split('/');
        const displayCategory = parts[parts.length - 1].trim();
        
        logger.debug('Creating button for category:', displayCategory);
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = displayCategory;
        button.style.display = 'inline-block'; // Ensure button is visible
        
        // Event listener to filter table based on clicked category
        button.addEventListener('click', () => {
            logger.debug('Category button clicked:', category);
            // Remove active state from all buttons
            document.querySelectorAll('.category-button').forEach(btn => 
                btn.classList.remove('active')
            );
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
    resetButton.style.display = 'inline-block'; // Ensure button is visible
    resetButton.addEventListener('click', () => {
        logger.debug('Reset button clicked');
        resetTable();
        // Remove active state from all category buttons
        document.querySelectorAll('.category-button').forEach(btn => 
            btn.classList.remove('active')
        );
        // Add active state to reset button
        resetButton.classList.add('active');
    });
    container.appendChild(resetButton);
    
    logger.debug('Finished generating category buttons');
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
            const highestDistribution = categoriesAboveThreshold[0].distribution;
            const tiebreakerCategories = categoriesAboveThreshold.filter(cat => 
                Math.abs(cat.distribution - highestDistribution) <= tiebreakThreshold
            );

            logger.debug('Categories above threshold:', categoriesAboveThreshold);
            logger.debug('Categories within tiebreaker threshold:', tiebreakerCategories);

            if (tiebreakerCategories.length > 1) {
                // Multiple categories within tiebreaker threshold
                confirmedPlacementElement.textContent = 'Multiple Placements';
                confirmedPlacementElement.className = 'status-pending';
                logger.info('Setting Multiple Placements due to tie:', tiebreakerCategories);
            } else if (tiebreakerCategories.length === 1) {
                // Single category above threshold or no ties within tiebreaker threshold
                updateConfirmedPlacement(tiebreakerCategories[0].category);
                logger.info('Setting single category placement:', tiebreakerCategories[0].category);
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
    
    // Always start with disabled button
    saveButton.disabled = true;

    // First check: Initial Placement
    if (!initialPlacement || initialPlacement === '' || initialPlacement === 'Not Set') {
        saveButton.title = 'Initial TIRE placement must be set before completing';
        logger.debug('Save button disabled: No initial placement', { initialPlacement });
        return;
    }

    // Second check: Confirmed Placement Status
    const scores = calculateTIREScores();
    const categoriesAboveThreshold = Object.entries(scores)
        .filter(([_, data]) => data.percentageScore >= distributionThreshold)
        .length;

    // Handle different confirmed placement scenarios
    if (confirmedPlacement.includes('Below Threshold')) {
        // Enable save button for below threshold cases
        saveButton.disabled = false;
        saveButton.title = 'Click to complete the assessment';
        logger.debug('Save button enabled: Below threshold case', { confirmedPlacement });
        return;
    }

    if (confirmedPlacement === 'Multiple Placements' && categoriesAboveThreshold > 1) {
        // Enable save button to trigger tiebreaker
        saveButton.disabled = false;
        saveButton.title = 'Click to select final placement from tiebreaker options';
        logger.debug('Save button enabled: Multiple placements need resolution', { 
            categoriesAboveThreshold,
            confirmedPlacement 
        });
        return;
    }

    // Valid confirmed placement check
    const isValidConfirmedPlacement = confirmedPlacement && 
                                    confirmedPlacement !== '' && 
                                    confirmedPlacement !== 'Not Set' && 
                                    confirmedPlacement !== '-' &&
                                    !confirmedPlacement.includes('Below Threshold');

    // Enable save button when we have both valid initial and confirmed placements
    if (isValidConfirmedPlacement) {
        saveButton.disabled = false;
        saveButton.title = 'Click to complete the assessment';
        logger.debug('Save button enabled: Valid placements', { 
            initialPlacement, 
            confirmedPlacement 
        });
    } else {
        saveButton.title = 'A valid confirmed TIRE placement is required before completing';
        logger.debug('Save button disabled: No valid confirmed placement', { confirmedPlacement });
    }
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

// Load strategy questions and initialize UI
async function initializeUI() {
    logger.debug('Initializing UI');
    try {
        const success = await loadStrategyQuestions();
        if (success) {
            generateCategoryButtons();
            logger.debug('Category buttons generated');
            
            // Initialize other UI elements
            initializeCalculationTabs();
            
            logger.debug('UI initialization complete');
        } else {
            logger.error('Failed to load strategy questions');
        }
    } catch (error) {
        logger.error('Error initializing UI:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.debug('DOMContentLoaded event fired');
    // Only set up event listeners here, wait for app name before initializing UI
    setupEventListeners();
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

// Setup all event listeners
function setupEventListeners() {
    logger.debug('Setting up event listeners');
    
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
    const closeAppBtn = document.getElementById('closeAppBtn');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const cancelCloseBtn = document.getElementById('cancelCloseBtn');
    const confirmCloseBtn = document.getElementById('confirmCloseBtn');

    // Log all elements to verify they're found
    logger.debug('Found UI elements:', {
        closeAppBtn: !!closeAppBtn,
        closeConfirmModal: !!closeConfirmModal,
        cancelCloseBtn: !!cancelCloseBtn,
        confirmCloseBtn: !!confirmCloseBtn
    });

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
            logger.debug('Restart button clicked');
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

    // Add cancel restart button event listener
    if (cancelRestartBtn) {
        cancelRestartBtn.addEventListener('click', () => {
            if (confirmationModal) {
                confirmationModal.style.display = 'none';
                confirmationModal.classList.remove('show');
            }
        });
    }

    // Add confirm restart button event listener
    if (confirmRestartBtn) {
        confirmRestartBtn.addEventListener('click', handleRestartConfirmation);
    }

    // Add save button event listener
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveButtonClick);
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

    // Add close button event listener
    if (closeAppBtn) {
        closeAppBtn.addEventListener('click', () => {
            logger.debug('Close button clicked');
            const mainContent = document.querySelector('.main-content');
            logger.debug('Main content state:', {
                found: !!mainContent,
                isCompleted: mainContent?.classList.contains('assessment-completed')
            });

            // If assessment is completed, close directly
            if (mainContent?.classList.contains('assessment-completed')) {
                logger.debug('Assessment is completed, closing directly');
                ipcRenderer.send('close-strategy-questions');
            } else {
                // Show confirmation modal
                logger.debug('Assessment not completed, showing confirmation modal');
                if (closeConfirmModal) {
                    closeConfirmModal.style.display = 'block';
                    closeConfirmModal.style.visibility = 'visible';
                    closeConfirmModal.style.opacity = '1';
                    closeConfirmModal.style.zIndex = '10000';
                    logger.debug('Confirmation modal displayed');
                } else {
                    logger.error('Close confirmation modal not found');
                }
            }
        });
    } else {
        logger.error('Close button not found in DOM');
    }

    // Add cancel close button event listener
    if (cancelCloseBtn) {
        cancelCloseBtn.addEventListener('click', () => {
            logger.debug('Cancel close button clicked');
            if (closeConfirmModal) {
                closeConfirmModal.style.display = 'none';
                logger.debug('Close confirmation modal hidden');
            } else {
                logger.error('Close confirmation modal not found when trying to cancel');
            }
        });
    } else {
        logger.error('Cancel close button not found in DOM');
    }

    // Add confirm close button event listener
    if (confirmCloseBtn) {
        confirmCloseBtn.addEventListener('click', () => {
            logger.debug('Confirm close button clicked, sending close event');
            ipcRenderer.send('close-strategy-questions');
        });
    } else {
        logger.error('Confirm close button not found in DOM');
    }

    // Close modal when clicking outside
    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', (event) => {
            logger.debug('Click event on close confirmation modal');
            if (event.target === closeConfirmModal) {
                logger.debug('Click was outside modal content, hiding modal');
                closeConfirmModal.style.display = 'none';
            }
        });
    }
    
    logger.debug('Event listeners setup complete');
}

// Function to handle restart confirmation
async function handleRestartConfirmation() {
    logger.debug('Handling restart confirmation');
    const restartReason = document.getElementById('restartReason').value.trim();
    
    if (!restartReason) {
        logger.warn('No restart reason provided');
        alert('Please provide a reason for restarting the assessment.');
        return;
    }

    try {
        // Get the application name
        const appNameElement = document.getElementById('applicationName');
        const applicationName = appNameElement ? appNameElement.textContent : null;

        if (!applicationName) {
            logger.error('Cannot restart: Application name not found');
            return;
        }

        // Get current TIRE placement before restart
        const confirmedPlacement = document.getElementById('confirmedTimePlacement').textContent;
        const initialPlacement = document.getElementById('initialTimePlacement').value;
        const currentTreatment = confirmedPlacement !== "Not Set" ? confirmedPlacement : initialPlacement;

        // Update restart history in localStorage
        const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
        if (!restartHistory[applicationName]) {
            restartHistory[applicationName] = [];
        }

        // Add new restart entry
        restartHistory[applicationName].push({
            date: new Date().toISOString(),
            reason: restartReason,
            treatmentAtRestart: currentTreatment
        });
        localStorage.setItem('restartHistory', JSON.stringify(restartHistory));

        // Update UI state
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.remove('assessment-completed');
            mainContent.classList.add('assessment-restarted');
        }

        // Enable all inputs
        document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
            element.disabled = false;
        });

        // Enable initial TIRE placement
        const initialTimePlacementSelect = document.getElementById('initialTimePlacement');
        if (initialTimePlacementSelect) {
            initialTimePlacementSelect.disabled = false;
        }

        // Update button visibility
        const restartButton = document.getElementById('restartBtn');
        const saveButton = document.getElementById('saveButton');
        if (restartButton) restartButton.style.display = 'none';
        if (saveButton) {
            saveButton.style.display = 'inline-block';
            saveButton.disabled = false;
        }

        // Hide the confirmation modal
        const confirmationModal = document.getElementById('confirmationModal');
        if (confirmationModal) {
            confirmationModal.style.display = 'none';
            confirmationModal.classList.remove('show');
        }

        // Clear the restart reason field
        document.getElementById('restartReason').value = '';

        logger.info('Assessment restarted successfully', {
            applicationName,
            restartReason,
            previousTreatment: currentTreatment
        });

        // Update completion status
        updateCompletionStatus();
    } catch (error) {
        logger.error('Error during restart confirmation:', error);
        alert('An error occurred while restarting the assessment. Please try again.');
    }
}

// Function to handle save button click
async function handleSaveButtonClick() {
    logger.debug('Save button clicked');
    
    const appNameElement = document.getElementById('applicationName');
    const applicationName = appNameElement ? appNameElement.textContent : null;
    
    if (!applicationName) {
        logger.error('Cannot save: Application name not found');
        return;
    }

    // Get current placements
    const confirmedPlacement = document.getElementById('confirmedTimePlacement').textContent;
    const initialPlacement = document.getElementById('initialTimePlacement').value;

    // Check if we need to show tiebreaker modal
    if (confirmedPlacement === 'Multiple Placements') {
        const scores = calculateTIREScores();
        const categoriesAboveThreshold = Object.entries(scores)
            .filter(([_, data]) => data.percentageScore >= distributionThreshold)
            .map(([category, data]) => ({
                category,
                distribution: data.percentageScore
            }))
            .sort((a, b) => b.distribution - a.distribution);

        if (categoriesAboveThreshold.length > 1) {
            logger.debug('Showing tiebreaker modal for categories:', categoriesAboveThreshold);
            const selectedCategory = await showTiebreakerModalWithPromise(categoriesAboveThreshold);
            
            if (selectedCategory === 'go-back') {
                logger.debug('User chose to go back and edit answers');
                return;
            }

            updateConfirmedPlacement(selectedCategory);
        }
    }

    try {
        // Create the output data
        const outputData = {
            applicationName: applicationName,
            initialTimePlacement: initialPlacement,
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
                restarts: JSON.parse(localStorage.getItem('restartHistory') || '{}')[applicationName] || [],
                hasBeenRestarted: document.querySelector('.main-content')?.classList.contains('assessment-restarted') || false
            }
        };

        // Send the data to the main process
        logger.debug('Sending save-strategy-questions event with data');
        ipcRenderer.send('save-strategy-questions', outputData);

        // Show completion modal
        showCompletionModal(applicationName);

        // Update UI state
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.add('assessment-completed');
            mainContent.classList.remove('assessment-restarted');
        }

        // Disable inputs
        document.querySelectorAll('#strategyQuestionsTable select, #strategyQuestionsTable input').forEach(element => {
            element.disabled = true;
        });

        // Update button visibility
        const restartButton = document.getElementById('restartBtn');
        const saveButton = document.getElementById('saveButton');
        if (restartButton) restartButton.style.display = 'inline-block';
        if (saveButton) saveButton.style.display = 'none';

        logger.info('Assessment saved successfully:', applicationName);
    } catch (error) {
        logger.error('Error saving assessment:', error);
        alert('An error occurred while saving the assessment. Please try again.');
    }
}

