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

// Global variables
let currentSection = 0;
let currentQuestionIndex = 0;
let hasUnsavedChanges = false;
let applicationName = '';
let answeredQuestions = 0;
let totalQuestions = 0;
let appQuestions = null;

// Question data structure
const sections = {
    'basicInfoSection': {
        title: 'Basic Application Information',
        next: 'contactInfoSection',
        prev: null,
        questions: [
            {
                id: 'migrationDrivers',
                title: 'Migration Drivers',
                required: true
            },
            {
                id: 'userBase',
                title: 'User Base',
                required: true
            },
            {
                id: 'appDescription',
                title: 'Application Description',
                required: true
            },
            {
                id: 'appFunction',
                title: 'Application Function',
                required: true
            },
            {
                id: 'appType',
                title: 'Application Type',
                required: true
            }
        ]
    },
    'contactInfoSection': {
        title: 'Contact Information',
        next: 'appDetailsSection',
        prev: 'basicInfoSection',
        questions: [
            {
                id: 'appOwner',
                title: 'App Owner',
                required: true
            },
            {
                id: 'appOwnerEmail',
                title: 'App Owner Email',
                required: true
            },
            {
                id: 'appOwnerAzureKnowledge',
                title: 'App Owner Azure Knowledge',
                required: true
            },
            {
                id: 'appSme',
                title: 'App SME',
                required: true
            },
            {
                id: 'appSmeEmail',
                title: 'App SME Email',
                required: true
            },
            {
                id: 'appSmeAzureKnowledge',
                title: 'App SME Azure Knowledge',
                required: true
            }
        ]
    },
    'appDetailsSection': {
        title: 'Application Details',
        next: 'cotsSection',
        prev: 'contactInfoSection',
        questions: [
            {
                id: 'businessCritical',
                title: 'Business Critical',
                required: true
            },
            {
                id: 'appCriticality',
                title: 'App Criticality',
                required: true
            },
            {
                id: 'disasterRecovery',
                title: 'Disaster Recovery',
                required: true
            },
            {
                id: 'highAvailability',
                title: 'High Availability',
                required: true
            },
            {
                id: 'piiData',
                title: 'PII Data',
                required: true
            }
        ]
    },
    'cotsSection': {
        title: 'COTS Details',
        next: 'supportSection',
        prev: 'appDetailsSection',
        questions: [
            {
                id: 'appTypeCotsName',
                title: 'COTS Software Name',
                required: false
            },
            {
                id: 'appTypeCotsVendorName',
                title: 'COTS Vendor Name',
                required: false
            },
            {
                id: 'appTypeCotsVersionInstalled',
                title: 'COTS Version',
                required: false
            },
            {
                id: 'appTypeCotsUrl',
                title: 'COTS URL',
                required: false
            },
            {
                id: 'appTypeCotsCanRunInAzure',
                title: 'Can Run in Azure',
                required: false
            },
            {
                id: 'appTypeCotsCanModernisedPaas',
                title: 'PaaS Modernization',
                required: false
            },
            {
                id: 'appTypeCotsNotes',
                title: 'COTS Notes',
                required: false
            }
        ]
    },
    'supportSection': {
        title: 'Support Information',
        next: 'healthSection',
        prev: 'cotsSection',
        questions: [
            {
                id: 'businessUnit',
                title: 'Business Unit',
                required: true
            },
            {
                id: 'deployment',
                title: 'Deployment',
                required: true
            },
            {
                id: 'backupRestorePolicies',
                title: 'Backup/Restore Policies',
                required: true
            },
            {
                id: 'supportedBy',
                title: 'Supported By',
                required: true
            },
            {
                id: 'supportTeamSize',
                title: 'Support Team Size',
                required: true
            },
            {
                id: 'supportTeamAzureKnowledge',
                title: 'Support Team Azure Knowledge',
                required: true
            }
        ]
    },
    'healthSection': {
        title: 'Health & Risk',
        next: null,
        prev: 'supportSection',
        questions: [
            {
                id: 'resilienceDataRetention',
                title: 'Resilience Data Retention',
                required: true
            },
            {
                id: 'healthStability',
                title: 'Health Stability',
                required: true
            },
            {
                id: 'healthDocumentation',
                title: 'Health Documentation',
                required: true
            },
            {
                id: 'backups',
                title: 'Backups',
                required: true
            },
            {
                id: 'inherentRisk',
                title: 'Inherent Risk',
                required: true
            },
            {
                id: 'materiality',
                title: 'Materiality',
                required: true
            }
        ]
    }
};

// State management
let formData = {};
let answers = new Map();

// DOM Elements
const form = document.getElementById('appQuestionsForm');
const saveButton = document.getElementById('saveButton');
const closeButton = document.getElementById('closeAppBtn');
const closeConfirmModal = document.getElementById('closeConfirmModal');
const cancelCloseBtn = document.getElementById('cancelCloseBtn');
const confirmCloseBtn = document.getElementById('confirmCloseBtn');
const completionModal = document.getElementById('completionModal');
const completionOkBtn = document.getElementById('completionOkBtn');
const completionMessage = document.getElementById('completionMessage');
const appNameDisplay = document.getElementById('appNameDisplay');
const completionStatus = document.getElementById('completionStatus');
const completionText = document.getElementById('completionText');
const completionDate = document.getElementById('completionDate');
const currentQuestionNum = document.getElementById('currentQuestionNum');
const totalQuestionsDisplay = document.getElementById('totalQuestions');
const currentSectionDisplay = document.getElementById('currentSection');
const sectionProgress = document.getElementById('sectionProgress');

// Navigation buttons
const prevSectionBtn = document.getElementById('prevSection');
const nextSectionBtn = document.getElementById('nextSection');
const prevQuestionBtn = document.getElementById('prevQuestion');
const nextQuestionBtn = document.getElementById('nextQuestion');
const skipQuestionBtn = document.getElementById('skipQuestion');

// Form sections
const formSections = document.querySelectorAll('.form-section');
const sectionsArray = Array.from(formSections);

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.debug('DOM Content Loaded - Initializing app-questions.js');
    setupEventListeners();
    initializeUI();
});

// Listen for application name when opening app questions window
ipcRenderer.on('app-name', (event, appName) => {
    logger.debug("Received app name:", appName);
    applicationName = appName;
    initializeApplicationName(appName);
    document.title = `Application Questions - ${appName}`;
});

// Listen for app questions data
ipcRenderer.on('app-questions-data', (event, questions) => {
    logger.debug('Received app questions data');
    appQuestions = questions;
    initializeQuestions();
});

function initializeApplicationName(appName) {
    logger.debug('Initializing application name:', appName);
    
    // Update the display name in the header
    if (appNameDisplay) {
        appNameDisplay.textContent = appName;
    }
    
    // Update the application input field
    const applicationInput = document.getElementById('application');
    if (applicationInput) {
        applicationInput.value = appName;
    }
}

function initializeUI() {
    logger.debug('Initializing UI');
    
    // Start with first section
    currentSection = 0;
    
    // Initialize display
    updateDisplay();
    updateCompletionStatus();
}

function initializeQuestions() {
    if (!appQuestions) {
        logger.error('No questions data available');
        return;
    }
    
    displayCurrentSection();
    setupNavigation();
    updateCompletionStatus();
}

function displayCurrentSection() {
    if (!questionContainer || !appQuestions) return;
    
    const section = appQuestions[currentSection + 1]; // Skip config section
    if (!section) return;

    questionContainer.innerHTML = `
        <h2>${section.section}</h2>
        <div class="questions">
            ${section.questions.map(q => createQuestionHTML(q)).join('')}
        </div>
    `;

    // Reattach event listeners
    setupEventListeners();
}

function createQuestionHTML(question) {
    const required = question.required ? 'required' : '';
    const helpText = question.helpText ? `<div class="help-text">${question.helpText}</div>` : '';
    
    let inputHTML = '';
    switch (question.type) {
        case 'text':
        case 'email':
            inputHTML = `<input type="${question.type}" id="${question.id}" name="${question.id}" ${required}>`;
            break;
        case 'textarea':
            inputHTML = `<textarea id="${question.id}" name="${question.id}" rows="4" ${required}></textarea>`;
            break;
        case 'select':
            inputHTML = `
                <select id="${question.id}" name="${question.id}" ${required}>
                    <option value="">Select an option</option>
                    ${question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>`;
            break;
        case 'select-multiple':
            inputHTML = `
                <select id="${question.id}" name="${question.id}" multiple ${required}>
                    ${question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>`;
            break;
    }

    return `
        <div class="question" data-id="${question.id}">
            <label for="${question.id}">${question.question}</label>
            ${inputHTML}
            ${helpText}
        </div>
    `;
}

function setupNavigation() {
    if (!navigationButtons || !appQuestions) return;

    const totalSections = appQuestions.length - 1; // Subtract 1 for config section
    navigationButtons.innerHTML = `
        <button id="prevButton" ${currentSection === 0 ? 'disabled' : ''}>Previous</button>
        <span>Section ${currentSection + 1} of ${totalSections}</span>
        <button id="nextButton" ${currentSection === totalSections - 1 ? 'disabled' : ''}>Next</button>
    `;

    document.getElementById('prevButton')?.addEventListener('click', () => {
        if (currentSection > 0) {
            currentSection--;
            displayCurrentSection();
            setupNavigation();
        }
    });

    document.getElementById('nextButton')?.addEventListener('click', () => {
        if (currentSection < totalSections - 1) {
            currentSection++;
            displayCurrentSection();
            setupNavigation();
        }
    });
}

function setupEventListeners() {
    logger.debug('Setting up event listeners');
    
    // Form change events
    if (form) {
        form.addEventListener('change', (e) => {
            logger.debug('Form change event:', e.target.id);
            hasUnsavedChanges = true;
            
            if (e.target.type === 'select-multiple') {
                const selectedValues = Array.from(e.target.selectedOptions).map(opt => opt.value);
                logger.debug('Multiple select values:', selectedValues);
            }
            
            updateCompletionStatus();
        });

        form.addEventListener('input', (e) => {
            logger.debug('Form input event:', e.target.id);
            if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'input') {
                hasUnsavedChanges = true;
                updateCompletionStatus();
            }
        });
    }

    // Section navigation buttons
    if (prevSectionBtn) {
        prevSectionBtn.addEventListener('click', () => {
            const sectionKeys = Object.keys(sections);
            const currentSectionKey = sectionKeys[currentSection];
            const prevSectionKey = sections[currentSectionKey].prev;
            
            if (prevSectionKey) {
                currentSection = sectionKeys.indexOf(prevSectionKey);
                currentQuestionIndex = 0;
                updateDisplay();
            }
        });
    }
    
    if (nextSectionBtn) {
        nextSectionBtn.addEventListener('click', () => {
            const sectionKeys = Object.keys(sections);
            const currentSectionKey = sectionKeys[currentSection];
            const nextSectionKey = sections[currentSectionKey].next;
            
            if (nextSectionKey) {
                currentSection = sectionKeys.indexOf(nextSectionKey);
                currentQuestionIndex = 0;
                updateDisplay();
            }
        });
    }
    
    // Question navigation buttons
    if (prevQuestionBtn) {
        prevQuestionBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                updateDisplay();
            }
        });
    }
    
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', () => {
            const sectionKeys = Object.keys(sections);
            const currentSectionKey = sectionKeys[currentSection];
            const sectionData = sections[currentSectionKey];
            
            const isLastSection = !sectionData.next;
            const isLastQuestion = currentQuestionIndex === sectionData.questions.length - 1;
            const isVeryLastQuestion = isLastSection && isLastQuestion;

            if (isVeryLastQuestion) {
                // If this is the last question, trigger save
                handleSaveButtonClick();
            } else if (currentQuestionIndex < sectionData.questions.length - 1) {
                // Move to next question in current section
                currentQuestionIndex++;
                updateDisplay();
            } else if (sectionData.next) {
                // Move to next section
                currentSection = sectionKeys.indexOf(sectionData.next);
                currentQuestionIndex = 0;
                updateDisplay();
            }
        });
    }
    
    // Skip question button
    if (skipQuestionBtn) {
        skipQuestionBtn.addEventListener('click', () => {
            // Same behavior as next question but without save on last question
            const sectionKeys = Object.keys(sections);
            const currentSectionKey = sectionKeys[currentSection];
            const sectionData = sections[currentSectionKey];
            
            if (currentQuestionIndex < sectionData.questions.length - 1) {
                currentQuestionIndex++;
                updateDisplay();
            } else if (sectionData.next) {
                currentSection = sectionKeys.indexOf(sectionData.next);
                currentQuestionIndex = 0;
                updateDisplay();
            }
        });
    }
    
    // Save and close buttons
    if (saveButton) saveButton.addEventListener('click', handleSaveButtonClick);
    if (closeButton) closeButton.addEventListener('click', handleCloseButtonClick);
    if (confirmCloseBtn) confirmCloseBtn.addEventListener('click', () => {
        hideCloseConfirmationModal();
        closeWindow();
    });
    if (cancelCloseBtn) cancelCloseBtn.addEventListener('click', hideCloseConfirmationModal);
    if (completionOkBtn) completionOkBtn.addEventListener('click', () => completionModal.style.display = 'none');
}

function updateDisplay() {
    logger.debug('Updating display', { currentSection, currentQuestionIndex });
    
    // Hide all sections and questions first
    document.querySelectorAll('.form-section').forEach(section => {
        section.style.display = 'none';
        section.querySelectorAll('.question-card').forEach(card => {
            card.style.display = 'none';
        });
    });
    
    // Get current section
    const sectionKeys = Object.keys(sections);
    const currentSectionKey = sectionKeys[currentSection];
    const sectionData = sections[currentSectionKey];
    
    if (!sectionData) {
        logger.error('Invalid section:', currentSectionKey);
        return;
    }
    
    // Show current section
    const sectionElement = document.getElementById(currentSectionKey);
    if (sectionElement) {
        sectionElement.style.display = 'block';
        
        // Show only current question
        const currentQuestion = sectionData.questions[currentQuestionIndex];
        if (currentQuestion) {
            const questionCard = sectionElement.querySelector(`[data-question="${currentQuestion.id}"]`);
            if (questionCard) {
                questionCard.style.display = 'block';
            }
        }
        
        // Update section title and progress
        if (currentSectionDisplay) {
            currentSectionDisplay.textContent = sectionData.title;
        }
    }
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Update progress
    updateProgress();
    
    // Update question counter
    updateQuestionCounter();
}

function updateNavigationButtons() {
    const sectionKeys = Object.keys(sections);
    const currentSectionKey = sectionKeys[currentSection];
    const sectionData = sections[currentSectionKey];
    
    // Previous section button
    if (prevSectionBtn) {
        prevSectionBtn.disabled = !sectionData.prev;
    }
    
    // Next section button
    if (nextSectionBtn) {
        nextSectionBtn.disabled = !sectionData.next;
    }
    
    // Previous question button
    if (prevQuestionBtn) {
        prevQuestionBtn.disabled = currentQuestionIndex === 0;
    }
    
    // Next/Finish question button
    if (nextQuestionBtn) {
        const isLastSection = !sectionData.next;
        const isLastQuestion = currentQuestionIndex === sectionData.questions.length - 1;
        const isVeryLastQuestion = isLastSection && isLastQuestion;

        if (isVeryLastQuestion) {
            nextQuestionBtn.textContent = 'Finish';
            nextQuestionBtn.classList.add('finish-button');
        } else {
            nextQuestionBtn.textContent = 'Next >';
            nextQuestionBtn.classList.remove('finish-button');
        }
        
        nextQuestionBtn.disabled = isLastQuestion && !sectionData.next;
    }
}

function updateProgress() {
    const sectionKeys = Object.keys(sections);
    const currentSectionKey = sectionKeys[currentSection];
    const sectionData = sections[currentSectionKey];
    
    // Calculate progress for current section
    const totalQuestions = sectionData.questions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    
    if (sectionProgress) {
        sectionProgress.style.width = `${progressPercent}%`;
    }
}

function updateQuestionCounter() {
    const sectionKeys = Object.keys(sections);
    const currentSectionKey = sectionKeys[currentSection];
    const sectionData = sections[currentSectionKey];
    
    if (currentQuestionNum && totalQuestionsDisplay) {
        currentQuestionNum.textContent = (currentQuestionIndex + 1).toString();
        totalQuestionsDisplay.textContent = sectionData.questions.length.toString();
    }
}

function updateCompletionStatus() {
    logger.debug('Updating completion status');
    const questions = Array.from(document.querySelectorAll('.question-card')).filter(card => 
        card.dataset.question !== 'application'
    );
    
    let answeredCount = 0;
    questions.forEach(question => {
        const input = question.querySelector('input, select, textarea');
        if (input) {
            if (input.type === 'select-multiple') {
                if (Array.from(input.selectedOptions).length > 0) answeredCount++;
            } else if (input.value.trim() !== '') {
                answeredCount++;
            }
        }
    });

    // Update the completion text
    if (completionText) {
        completionText.textContent = `${answeredCount} / ${questions.length} questions answered`;
    }
    
    // Update progress bar
    const progressPercent = (answeredCount / questions.length) * 100;
    if (sectionProgress) {
        sectionProgress.style.width = `${progressPercent}%`;
    }
    
    // Save button is always enabled
    if (saveButton) {
        saveButton.disabled = false;
        saveButton.title = 'Save answers';
    }
}

async function handleSaveButtonClick() {
    logger.debug('Save button clicked - starting save process');
    const form = document.getElementById('appQuestionsForm');
    if (!form) {
        logger.error('Form element not found with ID: appQuestionsForm');
        return;
    }

    try {
        // Collect form data
        logger.debug('Collecting form data');
        const data = {};
        
        // Get all form elements
        const formElements = form.elements;
        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i];
            
            // Skip elements without a name/id
            if (!element.name && !element.id) continue;
            
            const fieldName = element.name || element.id;
            
            // Handle different input types
            if (element.type === 'select-multiple') {
                // Handle multiple select
                data[fieldName] = Array.from(element.selectedOptions).map(opt => opt.value);
                logger.debug(`Collected multiple select field - ${fieldName}:`, data[fieldName]);
            } else if (element.type === 'select-one') {
                // Handle single select
                if (element.value) {
                    data[fieldName] = element.value;
                    logger.debug(`Collected select field - ${fieldName}: ${element.value}`);
                }
            } else if (element.type === 'checkbox') {
                // Handle checkbox
                data[fieldName] = element.checked;
                logger.debug(`Collected checkbox field - ${fieldName}: ${element.checked}`);
            } else if (element.value && element.value.trim() !== '') {
                // Handle text, email, textarea, etc.
                data[fieldName] = element.value.trim();
                logger.debug(`Collected input field - ${fieldName}: ${element.value}`);
            }
        }

        // Log collected data
        logger.debug('All form data collected:', data);

        // Create the output data
        logger.debug(`Creating output data object for app: ${applicationName}`);
        const outputData = {
            applicationName: applicationName,
            appQuestions: data,
            timestamp: new Date().toISOString(),
            summary: {
                totalQuestions: document.querySelectorAll('.question-card').length - 1, // Exclude application name
                answeredQuestions: Object.keys(data).length - 1, // Exclude application name
                isCompleted: true
            }
        };
        logger.debug('Output data created:', outputData);

        // Send the data to the main process
        logger.debug('Sending save-app-questions event to main process');
        const response = await ipcRenderer.invoke('save-app-questions', outputData);
        logger.debug('Received response from main process:', response);
        
        if (response.success) {
            logger.info(`Save successful. File saved at: ${response.filePath}`);
            // Show completion modal
            logger.debug('Showing completion modal');
            showCompletionModal(applicationName);
            // Update UI state
            hasUnsavedChanges = false;
            logger.info('Application questions saved successfully:', applicationName);
        } else {
            logger.error('Save failed with error:', response.message);
            throw new Error(response.message);
        }
    } catch (error) {
        logger.error('Error in save process:', error);
        alert('An error occurred while saving the application questions: ' + error.message);
    }
}

function showCompletionModal(appName) {
    logger.debug('Showing completion modal for app:', appName);
    const completionModal = document.getElementById('completionModal');
    const completionMessage = document.getElementById('completionMessage');
    const mainContent = document.querySelector('.app-questions-content');
    
    if (completionModal && completionMessage) {
        logger.debug('Found completion modal elements');
        completionMessage.innerHTML = `Congratulations! Your application <strong>${appName}</strong> questions have been completed and saved.<br><br>The application's answers can be updated at any time by reopening the application questions.`;
        completionModal.style.display = 'block';
        completionModal.style.visibility = 'visible';
        completionModal.style.opacity = '1';
        completionModal.style.zIndex = '10000';
        completionModal.classList.add('show');
        
        // Add completed class to main content using app-questions specific class
        if (mainContent) {
            logger.debug('Adding app-questions-completed class to main content');
            mainContent.classList.add('app-questions-completed');
        } else {
            logger.error('Main content element not found');
        }

        // Update UI state
        updateCompletionStatus();
        logger.debug('Completion modal shown successfully');
    } else {
        logger.error('Completion modal elements not found:', {
            modal: !!completionModal,
            message: !!completionMessage
        });
    }
}

function handleCloseButtonClick() {
    logger.debug('Close button clicked');
    if (hasUnsavedChanges) {
        logger.debug('Unsaved changes detected, showing confirmation modal');
        showCloseConfirmationModal();
    } else {
        logger.debug('No unsaved changes, closing window directly');
        closeWindow();
    }
}

function showCloseConfirmationModal() {
    logger.debug('Showing close confirmation modal');
    const modal = document.getElementById('closeConfirmModal');
    if (modal) {
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '10000';
    } else {
        logger.error('Close confirmation modal not found');
    }
}

function hideCloseConfirmationModal() {
    logger.debug('Hiding close confirmation modal');
    const modal = document.getElementById('closeConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Load existing app data if available
async function loadAppData() {
    if (!applicationName) {
        logger.error('No application name set');
        return;
    }
    
    try {
        const appData = await ipcRenderer.invoke('get-app-data', applicationName);
        if (appData && appData.appQuestions) {
            logger.debug('Found existing app data, populating form');
            
            // Populate each form field
            const questions = appData.appQuestions;
            
            // Handle migration drivers (multiple select)
            const migrationDrivers = document.getElementById('migrationDrivers');
            if (migrationDrivers && questions.migrationDrivers) {
                const values = Array.isArray(questions.migrationDrivers) ? 
                    questions.migrationDrivers : [questions.migrationDrivers];
                Array.from(migrationDrivers.options).forEach(option => {
                    option.selected = values.includes(option.value);
                });
            }

            // Handle all other fields
            const fields = [
                'userBase', 'appDescription', 'appFunction', 'appType',
                'businessCritical', 'appCriticality', 'appOwner', 'appOwnerEmail',
                'appSme', 'appSmeEmail', 'appOwnerAzureKnowledge', 'appSmeAzureKnowledge',
                'disasterRecovery', 'highAvailability', 'piiData',
                'backupRestorePolicies', 'resilienceDataRetention', 'backups',
                'businessUnit', 'deployment', 'supportedBy', 'supportTeamSize',
                'supportTeamAzureKnowledge', 'healthStability', 'healthDocumentation',
                'inherentRisk', 'materiality'
            ];

            fields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element && questions[fieldId] !== undefined) {
                    element.value = questions[fieldId];
                }
            });

            // Handle COTS specific fields
            if (questions.appType === 'COTS/ISV') {
                const cotsFields = [
                    'appTypeCotsSoftwareName', 'appTypeCotsVendorName',
                    'appTypeCotsVersionInstalled', 'appTypeCotsUrl',
                    'appTypeCotsCanRunInAzure', 'appTypeCotsCanModernisedPaas',
                    'appTypeCotsNotes'
                ];

                cotsFields.forEach(fieldId => {
                    const element = document.getElementById(fieldId);
                    if (element && questions[fieldId] !== undefined) {
                        element.value = questions[fieldId];
                    }
                });
            }

            // Update COTS section visibility
            updateCOTSSectionVisibility();
            
            logger.info('Successfully loaded previous app questions data');
        } else {
            logger.debug('No existing app data found');
        }
    } catch (error) {
        logger.error('Error loading app data:', error);
    }
}

function updateCOTSSectionVisibility() {
    const appType = document.getElementById('appType').value;
    const cotsSection = document.getElementById('cotsSection');
    if (cotsSection) {
        cotsSection.style.display = appType === 'COTS/ISV' ? 'block' : 'none';
    }
}

function closeWindow() {
    logger.debug('Closing app questions window');
    ipcRenderer.send('close-app-questions');
} 