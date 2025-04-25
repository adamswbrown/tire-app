const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

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
let questionContainer = null;

// DOM Elements
let form = null;
let closeButton = null;
let saveButton = null;
let exportButton = null;
let closeConfirmationModal = null;
let completionModal = null;
let completionOkBtn = null;
let completionMessage = null;
let appNameDisplay = null;
let completionStatus = null;
let completionText = null;
let completionDate = null;
let currentQuestionNum = null;
let totalQuestionsDisplay = null;
let currentSectionDisplay = null;
let sectionProgress = null;

// Navigation buttons
let prevSectionBtn = null;
let nextSectionBtn = null;
let prevQuestionBtn = null;
let nextQuestionBtn = null;
let skipQuestionBtn = null;

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.debug('DOM Content Loaded - Initializing app-questions.js');
    initializeElements();
    loadQuestions();
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
    logger.debug('Received app questions data:', questions);
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        logger.error('Invalid questions data received:', questions);
        return;
    }
    appQuestions = questions;
    initializeQuestions();
});

function initializeElements() {
    logger.debug('Initializing DOM elements');
    try {
        // Get all DOM elements
        questionContainer = document.getElementById('questionContainer');
        
        // Navigation buttons
        prevSectionBtn = document.getElementById('prevSection');
        nextSectionBtn = document.getElementById('nextSection');
        prevQuestionBtn = document.getElementById('prevQuestion');
        nextQuestionBtn = document.getElementById('nextQuestion');
        skipQuestionBtn = document.getElementById('skipQuestion');
        
        // Form elements
        form = document.getElementById('appQuestionsForm');
        closeButton = document.getElementById('closeButton');
        saveButton = document.getElementById('saveButton');
        exportButton = document.getElementById('exportButton');
        closeConfirmationModal = document.getElementById('closeConfirmModal');
        completionModal = document.getElementById('completionModal');
        completionOkBtn = document.getElementById('completionOkBtn');
        completionMessage = document.getElementById('completionMessage');
        appNameDisplay = document.getElementById('appNameDisplay');
        completionStatus = document.getElementById('completionStatus');
        completionText = document.getElementById('completionText');
        completionDate = document.getElementById('completionDate');
        currentQuestionNum = document.getElementById('currentQuestionNum');
        totalQuestionsDisplay = document.getElementById('totalQuestions');
        currentSectionDisplay = document.getElementById('currentSection');
        sectionProgress = document.getElementById('sectionProgress');

        // Set up initial event listeners
        setupEventListeners();
        
        logger.debug('DOM elements initialized successfully');
    } catch (error) {
        logger.error('Error initializing DOM elements:', error);
    }
}

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
    if (!appQuestions) {
        logger.debug('No questions data available yet');
        return;
    }
    
    // Start with first section
    currentSection = 0;
    currentQuestionIndex = 0;
    
    // Initialize display
    updateDisplay();
    updateCompletionStatus();
}

function initializeQuestions() {
    if (!appQuestions) {
        logger.error('No questions data available');
        return;
    }
    
    logger.debug('Initializing questions with data:', appQuestions);
    
    // Start with the first section (index 0)
    currentSection = 0;
    currentQuestionIndex = 0;
    displayCurrentSection();
    updateCompletionStatus();
}

function displayCurrentSection() {
    if (!questionContainer || !appQuestions || !Array.isArray(appQuestions)) {
        logger.error('Missing required elements for displaying section');
        return;
    }

    // Get the current section
    const section = appQuestions[currentSection];
    if (!section || !section.section || !section.questions || !Array.isArray(section.questions)) {
        logger.error('Invalid section format:', section);
        return;
    }

    logger.debug('Displaying section:', {
        sectionIndex: currentSection,
        sectionName: section.section,
        questionCount: section.questions.length,
        currentQuestionIndex: currentQuestionIndex
    });

    // Clear existing content
    questionContainer.innerHTML = '';

    // Create main content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'app-questions-content';
    contentWrapper.style.padding = '20px';
    contentWrapper.style.maxWidth = '800px';
    contentWrapper.style.margin = '0 auto';

    // Create section header
    const sectionHeader = document.createElement('h2');
    sectionHeader.textContent = section.section;
    sectionHeader.style.marginBottom = '20px';
    contentWrapper.appendChild(sectionHeader);

    // Get current question
    const currentQuestion = section.questions[currentQuestionIndex];
    if (!currentQuestion) {
        logger.error('Invalid question index:', currentQuestionIndex);
        return;
    }

    // Create question card
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';
    questionCard.dataset.question = currentQuestion.id;
    questionCard.style.cssText = `
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background-color: #fff;
        margin-bottom: 15px;
        width: 100%;
        box-sizing: border-box;
        display: block;
        position: relative;
    `;

    // Create question title
    const questionTitle = document.createElement('h3');
    questionTitle.textContent = currentQuestion.question;
    questionTitle.style.cssText = `
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
    `;
    questionCard.appendChild(questionTitle);

    // Add help text if present
    if (currentQuestion.helpText) {
        const helpText = document.createElement('div');
        helpText.className = 'help-text';
        helpText.textContent = currentQuestion.helpText;
        helpText.style.cssText = `
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            font-style: italic;
        `;
        questionCard.appendChild(helpText);
    }

    // Create input element based on question type
    let input;
    switch (currentQuestion.type) {
        case 'text':
        case 'email':
            input = document.createElement('input');
            input.type = currentQuestion.type;
            input.id = currentQuestion.id;
            input.name = currentQuestion.id;
            input.className = 'form-control';
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            `;
            if (currentQuestion.required) input.required = true;
            break;

        case 'textarea':
            input = document.createElement('textarea');
            input.id = currentQuestion.id;
            input.name = currentQuestion.id;
            input.rows = 4;
            input.className = 'form-control';
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
            `;
            if (currentQuestion.required) input.required = true;
            break;

        case 'select':
        case 'select-multiple':
        case 'multiselect':
            input = document.createElement('select');
            input.id = currentQuestion.id;
            input.name = currentQuestion.id;
            input.className = 'form-control';
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            `;
            
            if (currentQuestion.type === 'select-multiple' || currentQuestion.type === 'multiselect') {
                input.multiple = true;
                input.size = Math.min(5, currentQuestion.options?.length || 4);
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select an option';
                input.appendChild(defaultOption);
            }
            
            if (currentQuestion.required) input.required = true;

            // Add options
            if (currentQuestion.options) {
                currentQuestion.options.forEach(optionText => {
                    const option = document.createElement('option');
                    option.value = optionText;
                    option.textContent = optionText;
                    input.appendChild(option);
                });
            }
            break;

        default:
            logger.warn('Unknown question type:', currentQuestion.type);
            break;
    }

    if (input) {
        const inputWrapper = document.createElement('div');
        inputWrapper.style.marginTop = '10px';
        inputWrapper.appendChild(input);
        questionCard.appendChild(inputWrapper);
    }

    contentWrapper.appendChild(questionCard);
    questionContainer.appendChild(contentWrapper);

    // Update navigation
    setupNavigation();
    
    // Load existing answers
    loadExistingAnswers();
    
    // Update question counter and progress
    updateQuestionCounter();
    updateProgress();
    
    logger.debug('Question displayed successfully');
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
                    ${question.options ? question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : ''}
                </select>`;
            break;
        case 'select-multiple':
            inputHTML = `
                <select id="${question.id}" name="${question.id}" multiple ${required}>
                    ${question.options ? question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : ''}
                </select>`;
            break;
    }

    return `
        <div class="question-card" data-question="${question.id}">
            <h3>${question.question}</h3>
            ${helpText}
            ${inputHTML}
        </div>
    `;
}

function setupNavigation() {
    const section = appQuestions[currentSection];
    if (!section) return;

    // Update section navigation buttons
    if (prevSectionBtn) {
        prevSectionBtn.disabled = currentSection <= 0;
    }
    if (nextSectionBtn) {
        nextSectionBtn.disabled = currentSection >= appQuestions.length - 1;
    }

    // Update question navigation buttons
    if (prevQuestionBtn) {
        prevQuestionBtn.disabled = currentSection === 0 && currentQuestionIndex === 0;
    }
    if (nextQuestionBtn) {
        const isLastQuestion = currentQuestionIndex === section.questions.length - 1;
        const isLastSection = currentSection === appQuestions.length - 1;
        nextQuestionBtn.disabled = isLastQuestion && isLastSection;
    }

    // Update progress indicators
    if (currentQuestionNum && totalQuestionsDisplay) {
        currentQuestionNum.textContent = (currentQuestionIndex + 1).toString();
        totalQuestionsDisplay.textContent = section.questions.length.toString();
    }

    // Update section progress bar
    if (sectionProgress) {
        const progress = ((currentQuestionIndex + 1) / section.questions.length) * 100;
        sectionProgress.style.width = `${progress}%`;
    }

    // Update section title
    if (currentSectionDisplay) {
        currentSectionDisplay.textContent = section.section;
    }
}

function updateDisplay() {
    logger.debug('Updating display', { currentSection, currentQuestionIndex });
    
    if (!appQuestions) {
        logger.debug('No questions data available');
        return;
    }
    
    // Skip the config section (index 0)
    const section = appQuestions[currentSection + 1];
    if (!section) {
        logger.error('Invalid section:', currentSection);
        return;
    }
    
    // Show current question
    const currentQuestion = section.questions[currentQuestionIndex];
    if (currentQuestion) {
        const questionCard = document.querySelector(`[data-question="${currentQuestion.id}"]`);
        if (questionCard) {
            questionCard.style.display = 'block';
        }
    }
    
    // Update section title
    if (currentSectionDisplay) {
        currentSectionDisplay.textContent = section.section;
    }
    
    // Update navigation and progress
    setupNavigation();
    updateProgress();
    updateQuestionCounter();
}

function updateProgress() {
    const section = appQuestions[currentSection + 1];
    if (!section) return;
    
    // Calculate progress for current section
    const totalQuestions = section.questions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    
    if (sectionProgress) {
        sectionProgress.style.width = `${progressPercent}%`;
    }
}

function updateQuestionCounter() {
    const section = appQuestions[currentSection + 1];
    if (!section) return;
    
    if (currentQuestionNum && totalQuestionsDisplay) {
        currentQuestionNum.textContent = (currentQuestionIndex + 1).toString();
        totalQuestionsDisplay.textContent = section.questions.length.toString();
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

function shouldSkipSection(sectionIndex) {
    const section = appQuestions[sectionIndex];
    if (!section) return false;

    // If it's the COTS Details section
    if (section.section === "COTS Details") {
        // Get the app type answer from the form data
        const appTypeInput = document.getElementById('app_type');
        if (appTypeInput && appTypeInput.value === 'In-House Custom Built') {
            logger.debug('Skipping COTS Details section due to In-House Custom Built selection');
            return true;
        }
    }
    return false;
}

function handleNextQuestion() {
    const section = appQuestions[currentSection];
    if (!section) return;

    // If there are more questions in the current section
    if (currentQuestionIndex < section.questions.length - 1) {
        currentQuestionIndex++;
        displayCurrentSection();
    } 
    // If we're at the last question of the current section and there are more sections
    else if (currentSection < appQuestions.length - 1) {
        let nextSection = currentSection + 1;
        // Skip COTS section if needed
        while (shouldSkipSection(nextSection) && nextSection < appQuestions.length - 1) {
            logger.debug('Skipping section:', appQuestions[nextSection].section);
            nextSection++;
        }
        currentSection = nextSection;
        currentQuestionIndex = 0;
        displayCurrentSection();
    }
}

function handlePrevQuestion() {
    // If we can go to the previous question in current section
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentSection();
    } 
    // If we're at the first question of the section and there are previous sections
    else if (currentSection > 0) {
        let prevSection = currentSection - 1;
        // Skip COTS section if needed
        while (shouldSkipSection(prevSection) && prevSection > 0) {
            logger.debug('Skipping section (backwards):', appQuestions[prevSection].section);
            prevSection--;
        }
        currentSection = prevSection;
        const prevSectionData = appQuestions[prevSection];
        currentQuestionIndex = prevSectionData.questions.length - 1;
        displayCurrentSection();
    }
}

function handleNextSection() {
    if (currentSection < appQuestions.length - 1) {
        currentSection++;
        // Skip COTS section if needed
        while (shouldSkipSection(currentSection) && currentSection < appQuestions.length - 1) {
            currentSection++;
        }
        currentQuestionIndex = 0;
        displayCurrentSection();
    }
}

function handlePrevSection() {
    if (currentSection > 0) {
        currentSection--;
        // Skip COTS section if needed
        while (shouldSkipSection(currentSection) && currentSection > 0) {
            currentSection--;
        }
        currentQuestionIndex = 0;
        displayCurrentSection();
    }
}

// Update the form change handler to handle app type changes
function handleFormChange(e) {
    logger.debug('Form change event:', e.target.id);
    hasUnsavedChanges = true;
    
    // If app type changed, we might need to update navigation
    if (e.target.id === 'appType') {
        // If we're currently in the COTS section and switched to In-House
        if (e.target.value === 'In-House Custom Built') {
            const currentSectionObj = appQuestions[currentSection];
            if (currentSectionObj && currentSectionObj.section === "COTS Details") {
                // Move to the next non-COTS section
                handleNextSection();
            }
        }
    }
    
    updateCompletionStatus();
}

// Update the save function to handle skipped sections
async function handleSaveButtonClick() {
    try {
        logger.debug('Save button clicked');
        
        // Get the current application name
        const applicationInput = document.getElementById('application');
        const appName = applicationInput ? applicationInput.value : applicationName;
        
        if (!appName) {
            logger.error('No application name available');
            showNotification('Error: No application name available', 'error');
            return;
        }
        
        // Get the directory path from the main process
        const customerDir = await ipcRenderer.invoke('get-customer-directory');
        if (!customerDir) {
            logger.error('No customer directory available');
            showNotification('Error: No customer directory available', 'error');
            return;
        }
        
        // Create the application directory if it doesn't exist
        const appDir = path.join(customerDir, appName);
        if (!fs.existsSync(appDir)) {
            fs.mkdirSync(appDir, { recursive: true });
        }
        
        // Save the form data
        const formData = new FormData(form);
        const answers = {};
        
        // Process form data
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('question_')) {
                const questionId = key.replace('question_', '');
                answers[questionId] = value;
            }
        }
        
        // Save to file
        const answersPath = path.join(appDir, 'answers.json');
        fs.writeFileSync(answersPath, JSON.stringify(answers, null, 2));
        
        // Update completion status
        hasUnsavedChanges = false;
        updateCompletionStatus();
        
        showNotification('Answers saved successfully');
        logger.info('Answers saved successfully', { appName, answersPath });
        
    } catch (error) {
        logger.error('Error saving answers:', error);
        showNotification('Error saving answers: ' + error.message, 'error');
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
            
            // Handle App Type first to set up COTS fields correctly
            const appTypeField = document.getElementById('appType');
            if (appTypeField && questions.appType) {
                appTypeField.value = questions.appType;
                // Trigger the change event to handle COTS fields
                appTypeField.dispatchEvent(new Event('change'));
            }

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
            Object.entries(questions).forEach(([fieldId, value]) => {
                if (fieldId === 'application' || fieldId === 'migrationDrivers') return;
                
                const element = document.getElementById(fieldId);
                if (element) {
                    // Don't set COTS values if app type is In-House Custom Built
                    if (questions.appType === 'In-House Custom Built' && fieldId.startsWith('appTypeCots')) {
                        element.value = '';
                        element.disabled = true;
                    } else {
                        element.value = value;
                        element.disabled = false;
                    }
                }
            });
            
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

async function exportToExcel() {
    try {
        console.log('Starting export to Excel...');
        const filePath = path.join(app.getPath('desktop'), 'Customer X', `${applicationName}_app_questions.json`);
        
        // Read the JSON file
        const fileContent = await fs.readFile(filePath, 'utf8');
        const fileData = JSON.parse(fileContent);
        
        console.log('File data loaded:', fileData);
        
        if (!fileData.appQuestions) {
            throw new Error('Invalid file structure: missing appQuestions data');
        }

        // Prepare data for Excel
        const rows = [];
        const questions = fileData.appQuestions;
        
        // Skip 'application' since it's redundant with applicationName
        for (const [key, value] of Object.entries(questions)) {
            if (key === 'application') continue;
            
            // Special handling for migrationDrivers array
            if (key === 'migrationDrivers') {
                rows.push(['Migration Drivers', Array.isArray(value) ? value.join(', ') : value]);
                continue;
            }
            
            // Format the question key for better readability
            const formattedQuestion = key
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            rows.push([formattedQuestion, value]);
        }
        
        // Add summary information
        if (fileData.summary) {
            rows.push(['', '']); // Empty row for spacing
            rows.push(['Total Questions', fileData.summary.totalQuestions]);
            rows.push(['Answered Questions', fileData.summary.answeredQuestions]);
            rows.push(['Completed', fileData.summary.isCompleted ? 'Yes' : 'No']);
            rows.push(['Timestamp', new Date(fileData.timestamp).toLocaleString()]);
        }

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('App Questions');

        // Add header row
        worksheet.addRow(['Question', 'Answer']);
        
        // Add data rows
        rows.forEach(row => worksheet.addRow(row));

        // Style the worksheet
        worksheet.getColumn(1).width = 40;
        worksheet.getColumn(2).width = 60;
        
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Save the workbook
        const excelFilePath = path.join(app.getPath('desktop'), `${applicationName}_app_questions.xlsx`);
        await workbook.xlsx.writeFile(excelFilePath);
        
        console.log('Excel file created successfully at:', excelFilePath);
        
        // Show success message
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = `Excel file exported successfully to: ${excelFilePath}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        
        // Show error message
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = `Error exporting to Excel: ${error.message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Add event listener for export button
document.getElementById('exportButton').addEventListener('click', exportToExcel);

// Add this function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

async function handleExportButtonClick() {
    try {
        const appNameElement = document.getElementById('applicationName');
        if (!appNameElement) {
            console.error('Application name element not found');
            return;
        }

        const appName = appNameElement.value;
        if (!appName) {
            console.error('Application name is required for export');
            return;
        }

        const exportButton = document.getElementById('exportButton');
        exportButton.disabled = true;
        exportButton.textContent = 'Exporting...';

        const result = await window.electronAPI.exportAppQuestions(appName);
        
        if (result.success) {
            showNotification('Export successful! File saved to: ' + result.filePath, 'success');
        } else {
            showNotification('Export failed: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error during export:', error);
        showNotification('Export failed: ' + error.message, 'error');
    } finally {
        const exportButton = document.getElementById('exportButton');
        exportButton.disabled = false;
        exportButton.textContent = 'Export';
    }
}

// Add this function with other handlers
async function handleExport() {
    try {
        const appName = document.getElementById('applicationName').value;
        if (!appName) {
            showNotification('Please enter an application name first.', 'error');
            return;
        }

        exportButton.disabled = true;
        showNotification('Exporting data...', 'info');

        const response = await window.electronAPI.exportAppQuestions({ appName });
        
        if (response.success) {
            showNotification(`Successfully exported to ${response.filePath}`, 'success');
        } else {
            showNotification(response.error || 'Export failed', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export data', 'error');
    } finally {
        exportButton.disabled = false;
    }
}

function handleAppTypeChange(event) {
    const appType = event.target.value;
    const cotsFields = [
        'appTypeCotsName',
        'appTypeCotsVendorName',
        'appTypeCotsVersionInstalled',
        'appTypeCotsUrl',
        'appTypeCotsCanRunInAzure',
        'appTypeCotsCanModernisedPaas',
        'appTypeCotsNotes'
    ];

    if (appType === 'In-House Custom Built') {
        // Clear and disable COTS fields
        cotsFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
                field.disabled = true;
            }
        });
    } else {
        // Enable COTS fields
        cotsFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = false;
            }
        });
    }
}

function setupEventListeners() {
    logger.debug('Setting up event listeners');
    try {
        // Form change events
        if (form) {
            form.addEventListener('change', handleFormChange);
            form.addEventListener('input', handleFormInput);
        }

        // Section navigation
        if (prevSectionBtn) {
            prevSectionBtn.addEventListener('click', handlePrevSection);
        }
        if (nextSectionBtn) {
            nextSectionBtn.addEventListener('click', handleNextSection);
        }

        // Question navigation
        if (prevQuestionBtn) {
            prevQuestionBtn.addEventListener('click', handlePrevQuestion);
        }
        if (nextQuestionBtn) {
            nextQuestionBtn.addEventListener('click', handleNextQuestion);
        }
        if (skipQuestionBtn) {
            skipQuestionBtn.addEventListener('click', handleSkipQuestion);
        }

        // Action buttons
        if (saveButton) {
            saveButton.addEventListener('click', handleSaveButtonClick);
        }
        if (closeButton) {
            closeButton.addEventListener('click', handleCloseButtonClick);
        }
        if (exportButton) {
            exportButton.addEventListener('click', handleExportButtonClick);
        }
        if (completionOkBtn) {
            completionOkBtn.addEventListener('click', () => {
                if (completionModal) {
                    completionModal.style.display = 'none';
                }
            });
        }

        // Add event listener for App Type changes
        const appTypeSelect = document.getElementById('appType');
        if (appTypeSelect) {
            appTypeSelect.addEventListener('change', handleAppTypeChange);
        }

        logger.debug('Event listeners set up successfully');
    } catch (error) {
        logger.error('Error setting up event listeners:', error);
    }
}

// Event handler functions
function handleFormChange(e) {
    logger.debug('Form change event:', e.target.id);
    hasUnsavedChanges = true;
    
    // If app type changed, we might need to update navigation
    if (e.target.id === 'appType') {
        // If we're currently in the COTS section and switched to In-House
        if (e.target.value === 'In-House Custom Built') {
            const currentSectionObj = appQuestions[currentSection];
            if (currentSectionObj && currentSectionObj.section === "COTS Details") {
                // Move to the next non-COTS section
                handleNextSection();
            }
        }
    }
    
    updateCompletionStatus();
}

function handleFormInput(e) {
    if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'input') {
        logger.debug('Form input event:', e.target.id);
        hasUnsavedChanges = true;
        updateCompletionStatus();
    }
}

function handlePrevSection() {
    if (currentSection > 0) {
        currentSection--;
        // Skip COTS section if needed
        while (shouldSkipSection(currentSection) && currentSection > 0) {
            currentSection--;
        }
        currentQuestionIndex = 0;
        displayCurrentSection();
    }
}

function handleNextSection() {
    if (currentSection < appQuestions.length - 1) {
        currentSection++;
        // Skip COTS section if needed
        while (shouldSkipSection(currentSection) && currentSection < appQuestions.length - 1) {
            currentSection++;
        }
        currentQuestionIndex = 0;
        displayCurrentSection();
    }
}

function handlePrevQuestion() {
    // If we can go to the previous question in current section
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentSection();
    } 
    // If we're at the first question of the section and there are previous sections
    else if (currentSection > 0) {
        let prevSection = currentSection - 1;
        // Skip COTS section if needed
        while (shouldSkipSection(prevSection) && prevSection > 0) {
            logger.debug('Skipping section (backwards):', appQuestions[prevSection].section);
            prevSection--;
        }
        currentSection = prevSection;
        const prevSectionData = appQuestions[prevSection];
        currentQuestionIndex = prevSectionData.questions.length - 1;
        displayCurrentSection();
    }
}

function handleNextQuestion() {
    const section = appQuestions[currentSection];
    if (!section) return;

    // If there are more questions in the current section
    if (currentQuestionIndex < section.questions.length - 1) {
        currentQuestionIndex++;
        displayCurrentSection();
    } 
    // If we're at the last question of the current section and there are more sections
    else if (currentSection < appQuestions.length - 1) {
        let nextSection = currentSection + 1;
        // Skip COTS section if needed
        while (shouldSkipSection(nextSection) && nextSection < appQuestions.length - 1) {
            logger.debug('Skipping section:', appQuestions[nextSection].section);
            nextSection++;
        }
        currentSection = nextSection;
        currentQuestionIndex = 0;
        displayCurrentSection();
    }
}

function handleSkipQuestion() {
    handleNextQuestion();
}

async function loadExistingAnswers() {
    if (!applicationName) {
        logger.debug('No application name set, skipping loading existing answers');
        return;
    }
    
    try {
        const appData = await ipcRenderer.invoke('get-app-data', applicationName);
        if (appData && appData.appQuestions) {
            logger.debug('Found existing app data, populating form');
            
            Object.entries(appData.appQuestions).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    if (element.type === 'select-multiple' && Array.isArray(value)) {
                        Array.from(element.options).forEach(option => {
                            option.selected = value.includes(option.value);
                        });
                    } else {
                        element.value = value;
                    }
                }
            });
            
            updateCompletionStatus();
            logger.info('Successfully loaded previous app questions data');
        } else {
            logger.debug('No existing app data found');
        }
    } catch (error) {
        logger.error('Error loading app data:', error);
    }
}

// Load questions from JSON file
async function loadQuestions() {
    try {
        logger.debug('Loading questions from JSON file');
        const response = await ipcRenderer.invoke('load-app-questions');
        logger.debug('Received response from load-app-questions:', response);
        
        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to load questions');
        }
        
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            throw new Error('Invalid questions data format');
        }
        
        appQuestions = response.data;
        logger.debug('Questions loaded successfully:', appQuestions);
        initializeQuestions();
    } catch (error) {
        logger.error('Error loading questions:', error);
        // Show error in UI
        if (questionContainer) {
            questionContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Questions</h3>
                    <p>There was a problem loading the application questions. Please try refreshing the page or contact support.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }
} 