const { ipcRenderer } = require('electron');

// Global variable to store strategy questions
let strategyQuestions = [];

// Initialize global variables for answered questions and total questions
let totalQuestions = 0;
let answeredQuestions = 0;

let distributionThreshold = 80; // Default threshold, if not found in JSON
let tiebreakThreshold = 3; // Default threshold for considering scores as ties

// Listen for application name when opening strategy questions window
ipcRenderer.on('set-application-name', (event, appName) => {
    // Update the application name in the header
    const appNameElement = document.getElementById('applicationName');
    if (appNameElement) {
        appNameElement.textContent = appName;
        // Also update the window title
        document.title = `Strategy Questions - ${appName}`;
    }
});

async function loadStrategyQuestions() {
    try {
        const response = await fetch('questions.json'); // Assuming questions.json is in the same directory
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("Strategy questions loaded:", data);

        // Extract and set the thresholds
        if (data.length > 0 && data[0].config) {
            if (data[0].config.distributionThreshold) {
                distributionThreshold = data[0].config.distributionThreshold;
            }
            if (data[0].config.tiebreakThreshold) {
                tiebreakThreshold = data[0].config.tiebreakThreshold;
            }
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
    answeredQuestions = strategyQuestions.filter(q => q.clientAnswer !== '-').length;
    const counterElement = document.getElementById('completionText');
    if (counterElement) {
        counterElement.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`;
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

// Helper function to get temperature class based on percentage
function getTemperatureClass(percentage) {
    if (percentage >= 80) return 'temp-80-100';
    if (percentage >= 60) return 'temp-61-79';
    if (percentage >= 40) return 'temp-41-60';
    if (percentage >= 20) return 'temp-21-40';
    return 'temp-0-20';
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
            // No categories above threshold - show the highest distribution
            confirmedPlacementElement.textContent = `Below Threshold (${maxDistribution}%)`;
            confirmedPlacementElement.style.backgroundColor = '#fff3cd';
            confirmedPlacementElement.style.color = '#856404';
            confirmedPlacementElement.style.borderColor = '#ffeeba';
            confirmedPlacementElement.classList.add('below-threshold');
        } else if (categoriesAboveThreshold.length === 1) {
            // Single category above threshold
            updateConfirmedPlacement(categoriesAboveThreshold[0].category);
        } else {
            // Multiple categories above threshold - will be handled during save
            const maxAboveThreshold = Math.max(...categoriesAboveThreshold.map(c => c.distribution));
            const highestCategory = categoriesAboveThreshold.find(c => c.distribution === maxAboveThreshold);
            updateConfirmedPlacement(highestCategory.category);
        }
    }

    updateSaveButtonState();
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
    const thresholdElement = document.getElementById('distribution-threshold');
    const tiebreakElement = document.getElementById('tiebreaker-threshold');
    if (thresholdElement) {
        thresholdElement.textContent = distributionThreshold;
    }
    if (tiebreakElement) {
        tiebreakElement.textContent = tiebreakThreshold;
    }
});



// Function to save answers, notes, and summary outcomes to an external file
async function saveToFile() {
    // Check Initial TIRE Placement first
    const initialTimePlacement = document.getElementById('initialTimePlacement').value;
    if (!initialTimePlacement) {
        alert('Please set an Initial TIRE Placement before saving.');
        return;
    }

    // Calculate scores and check if any category is above threshold
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

    // Find categories above threshold
    let categoriesAboveThreshold = [];
    Object.entries(scores).forEach(([category, data]) => {
        const score = parseInt(data.score) || 0;
        const total = parseInt(data.total) || 0;
        const distribution = total > 0 ? Math.round((score / total) * 100) : 0;
        if (distribution >= distributionThreshold) {
            categoriesAboveThreshold.push({ category, distribution });
        }
    });

    if (categoriesAboveThreshold.length === 0) {
        alert(`At least one TIRE category must be above the distribution threshold (${distributionThreshold}%) to complete the assessment.`);
        return;
    }

    // Handle tiebreaker if needed
    if (categoriesAboveThreshold.length > 1) {
        const maxAboveThreshold = Math.max(...categoriesAboveThreshold.map(c => c.distribution));
        const categoriesNeedingTiebreak = categoriesAboveThreshold.filter(
            c => maxAboveThreshold - c.distribution <= tiebreakThreshold
        );

        if (categoriesNeedingTiebreak.length > 1) {
            try {
                const selectedCategory = await showTiebreakerModalWithPromise(categoriesNeedingTiebreak);
                if (selectedCategory === 'go-back') {
                    return; // User wants to go back and edit answers
                }
                updateConfirmedPlacement(selectedCategory);
            } catch (error) {
                console.error('Tiebreaker modal error:', error);
                return;
            }
        }
    }

    // Get the current values after potential tiebreaker selection
    const confirmedTimePlacement = document.getElementById('confirmedTimePlacement').textContent;
    const appName = document.getElementById('applicationName').textContent;

    // Get restart history for this application
    const restartHistory = JSON.parse(localStorage.getItem('restartHistory') || '{}');
    const appRestarts = restartHistory[appName] || [];

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

    // Calculate final distributions for saving
    Object.entries(scores).forEach(([category, data]) => {
        data.distribution = data.total > 0 ? Math.round((data.score / data.total) * 100) + '%' : '0%';
    });

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

// Updated tiebreaker modal function that returns a Promise
function showTiebreakerModalWithPromise(categories) {
    return new Promise((resolve, reject) => {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.id = 'tiebreakerModal';
        
        // Check if Invest is among the categories and has a high enough score
        const investCategory = categories.find(c => c.category === 'invest');
        const initialTimePlacement = document.getElementById('initialTimePlacement').value.toLowerCase();
        
        // Remove auto-selection of Invest
        const modalContent = `
            <div class="modal-content">
                <h2>Multiple Categories Above Threshold</h2>
                <p>Multiple categories have met or exceeded the distribution threshold (${distributionThreshold}%) 
                   and are within the tiebreaker threshold of ${tiebreakThreshold}% of each other.</p>
                
                <div class="category-scores">
                    ${categories.map(c => `
                        <div class="category-score">
                            <strong>${c.category.charAt(0).toUpperCase() + c.category.slice(1)}:</strong> ${c.distribution}%
                        </div>
                    `).join('')}
                </div>

                <p>Please select the final TIRE placement:</p>
                
                <div class="category-buttons">
                    ${categories.map(c => `
                        <button class="category-select-btn" data-category="${c.category}">
                            ${c.category.toUpperCase()}
                        </button>
                    `).join('')}
                </div>
                
                <div class="tiebreaker-info">
                    <p><strong>Tiebreaker Rules Applied:</strong></p>
                    <ul>
                        <li>Categories within ${tiebreakThreshold}% are considered ties</li>
                        <li>Initial TIRE placement is considered as a tiebreaker</li>
                    </ul>
                </div>

                <div class="modal-buttons">
                    <button class="go-back-btn">Go Back and Edit Answers</button>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);

        // Add event listeners for category selection
        const buttons = modal.querySelectorAll('.category-select-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedCategory = button.dataset.category;
                modal.remove();
                resolve(selectedCategory);
            });
        });

        // Add event listener for go back button
        const goBackBtn = modal.querySelector('.go-back-btn');
        goBackBtn.addEventListener('click', () => {
            modal.remove();
            resolve('go-back');
        });

        // Close modal when clicking outside (treated as "go back")
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
                resolve('go-back');
            }
        });
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

// Add all event listeners inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Existing modal event listeners for restart functionality...

    // Add calculations modal event listeners
    const calculationsModal = document.getElementById('calculationsModal');
    const closeCalculationsBtn = document.getElementById('closeCalculationsBtn');
    const explanationBtn = document.getElementById('explanationBtn');
    const saveButton = document.getElementById('saveButton');

    if (saveButton) {
        saveButton.addEventListener('click', saveToFile);
    }

    if (explanationBtn) {
        explanationBtn.addEventListener('click', () => {
            if (calculationsModal) {
                calculationsModal.classList.add('show');
                document.body.style.overflow = 'hidden';
                
                // Update threshold values in modal
                const modalThreshold = document.getElementById('modal-threshold');
                const modalTiebreak = document.getElementById('modal-tiebreak');
                if (modalThreshold) {
                    modalThreshold.textContent = distributionThreshold;
                }
                if (modalTiebreak) {
                    modalTiebreak.textContent = tiebreakThreshold;
                }
            }
        });
    }

    if (closeCalculationsBtn) {
        closeCalculationsBtn.addEventListener('click', () => {
            if (calculationsModal) {
                calculationsModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }

    if (calculationsModal) {
        calculationsModal.addEventListener('click', (event) => {
            if (event.target === calculationsModal) {
                calculationsModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });

        // Add Escape key handler
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && calculationsModal.classList.contains('show')) {
                calculationsModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }

    // Add event listener for Initial TIRE Placement changes
    const initialTimePlacement = document.getElementById('initialTimePlacement');
    if (initialTimePlacement) {
        initialTimePlacement.addEventListener('change', () => {
            console.log('Initial TIRE Placement changed'); // Debug log
            updateSaveButtonState();
        });
    }
    
    // Also update save button state when answers change
    const strategyQuestionsTable = document.getElementById('strategyQuestionsTable');
    if (strategyQuestionsTable) {
        strategyQuestionsTable.addEventListener('change', (event) => {
            if (event.target.tagName === 'SELECT' || event.target.tagName === 'INPUT') {
                console.log('Answer changed'); // Debug log
                updateSaveButtonState();
            }
        });
    }
});

// Listen for threshold updates
ipcRenderer.on('thresholds-updated', (event, thresholds) => {
    console.log('Thresholds updated:', thresholds);
    distributionThreshold = thresholds.distributionThreshold;
    tiebreakThreshold = thresholds.tiebreakThreshold;
    
    // Update threshold displays
    const thresholdElement = document.getElementById('distribution-threshold');
    const tiebreakElement = document.getElementById('tiebreaker-threshold');
    if (thresholdElement) {
        thresholdElement.textContent = distributionThreshold;
    }
    if (tiebreakElement) {
        tiebreakElement.textContent = tiebreakThreshold;
    }
    
    // Recalculate scores and update UI
    updateClientScores();
    updateConfirmedTimePlacement();
});

// Update this function to correctly check conditions and enable the save button
function updateSaveButtonState() {
    const saveButton = document.getElementById('saveButton');
    if (!saveButton) return;

    const initialTimePlacement = document.getElementById('initialTimePlacement').value;
    
    // Check if any category is above threshold
    let hasAboveThreshold = false;
    const scores = {
        tolerate: { score: 0, total: 0 },
        invest: { score: 0, total: 0 },
        replace: { score: 0, total: 0 },
        eliminate: { score: 0, total: 0 }
    };

    // Calculate scores and distributions
    strategyQuestions.forEach(row => {
        const category = row.time.toLowerCase();
        if (scores[category]) {
            const weight = parseInt(row.weight) || 0;
            scores[category].score += parseInt(row.clientScore) || 0;
            scores[category].total += weight;
        }
    });

    // Check distributions
    Object.entries(scores).forEach(([category, data]) => {
        const score = parseInt(data.score) || 0;
        const total = parseInt(data.total) || 0;
        const distribution = total > 0 ? Math.round((score / total) * 100) : 0;
        console.log(`${category} distribution: ${distribution}%`); // Debug log
        if (distribution >= distributionThreshold) {
            hasAboveThreshold = true;
        }
    });

    console.log('Initial TIRE Placement:', initialTimePlacement); // Debug log
    console.log('Has Above Threshold:', hasAboveThreshold); // Debug log

    // Enable/disable save button based on conditions
    const canComplete = initialTimePlacement !== "" && hasAboveThreshold;
    console.log('Can Complete:', canComplete); // Debug log
    
    saveButton.disabled = !canComplete;
    saveButton.style.opacity = canComplete ? '1' : '0.5';
    saveButton.title = canComplete ? 
        'Complete the assessment' : 
        `Requirements:\n1. Set Initial TIRE Placement\n2. At least one category must be above ${distributionThreshold}% threshold`;
}

// Add the missing updateConfirmedPlacement function
function updateConfirmedPlacement(category) {
    const confirmedPlacementElement = document.getElementById('confirmedTimePlacement');
    if (confirmedPlacementElement) {
        const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        confirmedPlacementElement.textContent = formattedCategory;
        confirmedPlacementElement.style.backgroundColor = '#28a745';
        confirmedPlacementElement.style.color = '#ffffff';
        confirmedPlacementElement.style.borderColor = '#1e7e34';
        confirmedPlacementElement.classList.remove('below-threshold');
    }
}

// Function to update completion status
function updateCompletionStatus() {
    const completionText = document.getElementById('completionText');
    const completionHeader = document.getElementById('completionStatus');
    
    // Count answered questions
    answeredQuestions = strategyQuestions.filter(q => q.clientAnswer && q.clientAnswer !== '-').length;
    
    // Update completion text
    if (completionText) {
        completionText.textContent = `${answeredQuestions} / ${totalQuestions} questions answered`;
    }
    
    // Update header style based on completion
    if (completionHeader) {
        if (answeredQuestions === totalQuestions) {
            completionHeader.classList.remove('incomplete');
            completionHeader.classList.add('complete');
        } else {
            completionHeader.classList.remove('complete');
            completionHeader.classList.add('incomplete');
        }
    }
    
    // Update answered questions counter
    updateAnsweredQuestionsCounter();
}

