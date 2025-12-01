const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const Store = require('electron-store');
const sanitize = require('sanitize-filename');

let mainWindow;
let startWindow;
let strategyQuestionsWindow = null;
let explanationWindow = null;
let distributionThreshold = 80;
let completedApps = [];
let uploadedData = null; // Store uploaded data
let adminWindow = null;
let appQuestionsWindow = null;
const store = new Store();

// Add function to load strategy questions
function loadStrategyQuestions() {
    try {
        const questionsPath = path.join(__dirname, 'strategy-questions.json');
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        return questionsData;
    } catch (error) {
        console.error('Error loading strategy-questions.json:', error);
        return null;
    }
}

// Load the strategy-questions.json to extract the distributionThreshold
function loadDistributionThreshold() {
    try {
        const questionsPath = path.join(__dirname, 'strategy-questions.json');
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        if (questionsData && questionsData[0] && questionsData[0].config) {
            distributionThreshold = questionsData[0].config.distributionThreshold;
        }
    } catch (error) {
        console.error('Error loading strategy-questions.json:', error);
    }
}

// Create the start window
function createStartWindow() {
    startWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false
    });

    startWindow.maximize();
    startWindow.show();

    startWindow.loadFile('start.html');

    startWindow.on('closed', () => {
        startWindow = null;
    });
}

// Create the main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1917,
        height: 838,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false
    });

    mainWindow.maximize();
    mainWindow.show();

    mainWindow.loadFile('index.html').catch(err => console.error('Error loading index.html:', err));

    // Send the uploaded data once the window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        if (uploadedData) {
            mainWindow.webContents.send('uploaded-data', uploadedData);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Add this after creating your window
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux
        if ((input.meta && input.alt && input.key === 'i') || 
            (input.control && input.shift && input.key === 'i')) {
            mainWindow.webContents.openDevTools();
            event.preventDefault();
        }
    });
}

// Handle showing main window after successful upload
ipcMain.on('show-main-window', () => {
    createMainWindow();
    if (startWindow) {
        startWindow.close();
    }
});

// Expose completed apps list to renderer process
ipcMain.handle('get-completed-apps', () => {
    return completedApps.map(app => {
        const result = [];
        if (app.appQuestionsCompleted) {
            result.push(app.name + '_app_questions');
        }
        if (app.strategyQuestions) {
            result.push(app.name + '_strategy_questions');
        }
        return result;
    }).flat();
});

// Handle Excel upload and send data back to renderer
ipcMain.handle('upload-file', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            properties: ['openFile'],
        });

        if (canceled || filePaths.length === 0) return { error: 'No file selected.' };

        const workbook = xlsx.readFile(filePaths[0]);
        const sheetName = 'App-to-Server List';
        const worksheet = workbook.Sheets[sheetName];

        if (worksheet) {
            // Get the range of the worksheet
            const range = xlsx.utils.decode_range(worksheet['!ref']);
            
            // Read headers from row 4 (1-based)
            const headers = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
                const headerCell = worksheet[xlsx.utils.encode_cell({r: 3, c: C})]; // row 4 is index 3
                if (headerCell) headers[C] = headerCell.v;
            }
            
            console.log('All Excel Headers:', headers);

            // Define required and optional fields
            const requiredFields = [
                'Application Name',
                'Assessment Scope',
                'Data Center',
                'Environment',
                'Server'
            ];
            
            const optionalFields = [
                'Treatment (optional)',
                'Solution (optional)',
                'Other Solution - if applicable (optional)',
                'Power Status',
                'Operating System',
                'SQL Detected',
                'VMWare Description'
            ];

            // Find column indices for all fields (required and optional)
            const fieldIndices = {};
            [...requiredFields, ...optionalFields].forEach(fieldName => {
                const index = headers.findIndex(h => h === fieldName);
                if (index !== -1) {
                    fieldIndices[fieldName] = index;
                } else if (requiredFields.includes(fieldName)) {
                    // Log warning for missing required fields but don't fail
                    console.warn(`Warning: Required field "${fieldName}" not found in Excel file`);
                } else {
                    // Log info for missing optional fields
                    console.log(`Info: Optional field "${fieldName}" not found in Excel file`);
                }
            });

            console.log('Field indices found:', fieldIndices);

            // Validate that required fields are present
            const missingRequiredFields = requiredFields.filter(field => !(field in fieldIndices));
            if (missingRequiredFields.length > 0) {
                return { error: `Missing required columns: ${missingRequiredFields.join(', ')}` };
            }

            // Read all rows starting from row 5
            const rows = [];
            for (let R = 4; R <= range.e.r; R++) { // Start from row 5 (index 4)
                const row = {};
                // Read all columns dynamically
                for (let C = 0; C < headers.length; C++) {
                    const headerName = headers[C];
                    if (headerName) {
                        const cell = worksheet[xlsx.utils.encode_cell({r: R, c: C})];
                        row[headerName] = cell ? cell.v : '';
                    }
                }
                rows.push(row);
            }

            console.log('First row raw data:', rows[0]);

            // Transform the data - include all available fields
            const transformedData = rows.map(row => {
                const transformedRow = {};
                
                // Add required fields
                requiredFields.forEach(fieldName => {
                    transformedRow[fieldName] = row[fieldName] || '';
                });
                
                // Add optional fields if they exist in the headers (and thus in the row data)
                optionalFields.forEach(fieldName => {
                    if (fieldName in fieldIndices) {
                        transformedRow[fieldName] = row[fieldName] || '';
                    }
                });
                
                return transformedRow;
            });

            // Filter out rows where Application Name is empty or 'Unassociated'
            const filteredData = transformedData.filter(row => 
                row['Application Name'] && 
                row['Application Name'] !== 'Unassociated'
            );

            // Deduplicate applications by using a Map to keep only the first occurrence
            const uniqueApps = new Map();
            filteredData.forEach(row => {
                const appKey = row['Application Name'];
                if (!uniqueApps.has(appKey)) {
                    uniqueApps.set(appKey, row);
                }
            });

            // Convert Map back to array
            const deduplicatedData = Array.from(uniqueApps.values());

            console.log('Sample transformed row:', deduplicatedData[0]);
            console.log('Total rows after filtering and deduplication:', deduplicatedData.length);
            console.log('Available fields in transformed data:', Object.keys(deduplicatedData[0] || {}));

            return deduplicatedData;
        } else {
            return { error: 'Sheet "App-to-Server List" not found in the Excel file.' };
        }
    } catch (error) {
        console.error('Error during Excel upload:', error);
        return { error: 'Error processing Excel file.' };
    }
});

// Open strategy questions window
ipcMain.on('open-strategy-questions-window', (event, appName) => {
    if (strategyQuestionsWindow) {
        strategyQuestionsWindow.focus();
        return;
    }

    strategyQuestionsWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false  // Don't show until we maximize
    });

    strategyQuestionsWindow.maximize();  // Maximize the window
    strategyQuestionsWindow.show();      // Show after maximizing

    strategyQuestionsWindow.loadFile('strategy-questions.html').then(() => {
        // Load and send strategy questions data
        const strategyQuestions = loadStrategyQuestions();
        if (strategyQuestions) {
            strategyQuestionsWindow.webContents.send('strategy-questions-data', strategyQuestions);
        }
        strategyQuestionsWindow.webContents.send('app-name', appName);
        strategyQuestionsWindow.webContents.send('set-distribution-threshold', distributionThreshold);
    });

    strategyQuestionsWindow.on('closed', () => {
        strategyQuestionsWindow = null;
    });
});

// Handle closing strategy questions window
ipcMain.on('close-strategy-questions', () => {
    if (strategyQuestionsWindow) {
        strategyQuestionsWindow.close();
        strategyQuestionsWindow = null;
    }
});

// Modify the markAppCompleted function to store full application data
function markAppCompleted(appName, initialPlacement, confirmedPlacement, confirmedPlacementSet, fullData) {
    const existingAppIndex = completedApps.findIndex(app => app.name === appName);
    const previousPlacement = existingAppIndex !== -1 ? 
        (completedApps[existingAppIndex].confirmedTIREPlacement !== "Not Set" ? 
            completedApps[existingAppIndex].confirmedTIREPlacement : 
            completedApps[existingAppIndex].initialTIREPlacement) : null;

    const appData = {
        name: appName,
        completedOn: new Date().toISOString(),
        initialTIREPlacement: initialPlacement || "Not Set",
        confirmedTIREPlacement: confirmedPlacement || "Not Set",
        confirmedPlacementSet,
        previousTIREPlacement: previousPlacement,
        answers: fullData.answers,
        summary: fullData.summary,
        assessmentHistory: {
            previousPlacements: existingAppIndex !== -1 ? 
                [...(completedApps[existingAppIndex].assessmentHistory?.previousPlacements || []), 
                    { 
                        date: new Date().toISOString(),
                        previousStatus: previousPlacement,
                        newStatus: confirmedPlacement !== "Not Set" ? confirmedPlacement : initialPlacement
                    }
                ] : []
        }
    };

    if (existingAppIndex !== -1) {
        completedApps[existingAppIndex] = appData;
    } else {
        completedApps.push(appData);
    }

    // Notify the main window of the update
    if (mainWindow) {
        mainWindow.webContents.send('app-completed', appName);
    }
}

// Update getCompletedAppsDirectory to create directory if it doesn't exist
function getCompletedAppsDirectory() {
    console.log('Getting completed apps directory');
    let dir = store.get('completedAppsDirectory');
    console.log('Directory from store:', dir);
    
    if (!dir) {
        console.log('No directory in store, using default');
        dir = path.join(app.getPath('userData'));
        console.log('Default directory:', dir);
        store.set('completedAppsDirectory', dir);
    }
    
    // Ensure the directory exists
    if (!fs.existsSync(dir)) {
        console.log('Directory does not exist, creating it');
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log('Directory created successfully');
        } catch (error) {
            console.error('Error creating directory:', error);
            return null;
        }
    }
    
    console.log('Using directory:', dir);
    return dir;
}

// Update select-directory handler
ipcMain.handle('select-directory', async () => {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Directory for Completed Applications',
            message: 'Choose where to store completed application data',
            buttonLabel: 'Select Directory'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const dir = result.filePaths[0];
            
            // Create the directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Check for existing JSON files
            const existingFiles = fs.readdirSync(dir)
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    try {
                        const filePath = path.join(dir, file);
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        return {
                            name: data.applicationName,
                            lastModified: fs.statSync(filePath).mtime
                        };
                    } catch (error) {
                        console.error(`Error reading file ${file}:`, error);
                        return null;
                    }
                })
                .filter(file => file !== null);
            
            // Update the store with the new directory
            store.set('completedAppsDirectory', dir);
            
            // Reload completed apps from the new directory
            await loadCompletedAppsFromDirectory();
            
            // Notify main window to refresh
            if (mainWindow) {
                mainWindow.webContents.send('refresh-data');
            }
            
            return { 
                path: dir,
                existingFiles: existingFiles
            };
        }
        return { path: null, existingFiles: [] };
    } catch (error) {
        console.error('Error selecting directory:', error);
        throw error;
    }
});

// Modify the save-answers-to-file handler
ipcMain.on('save-answers-to-file', async (event, outputData) => {
    console.log('Received save-answers-to-file request');
    try {
        let completedAppsDir = getCompletedAppsDirectory();
        console.log('Completed apps directory:', completedAppsDir);
        
        // If no directory is set, prompt for one
        if (!completedAppsDir) {
            console.log('No directory set, prompting user');
            completedAppsDir = await promptForCompletedAppsDirectory();
            if (!completedAppsDir) {
                console.error('No directory selected by user');
                event.reply('save-error', 'No directory selected for storing completed applications.');
                return;
            }
        }

        const appName = outputData.applicationName;
        console.log('Saving assessment for app:', appName);
        
        const sanitizedAppName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(completedAppsDir, `${sanitizedAppName}.json`);
        console.log('File will be saved to:', filePath);

        // Save the file
        console.log('Writing file...');
        fs.writeFile(filePath, JSON.stringify(outputData, null, 2), (err) => {
            if (err) {
                console.error('Error saving file:', err);
                event.reply('save-error', 'Failed to save answers to file: ' + err.message);
                return;
            }
            
            console.log('File saved successfully');
            
            // Update the completedApps array
            console.log('Updating completedApps array');
            markAppCompleted(
                outputData.applicationName, 
                outputData.initialTimePlacement, 
                outputData.confirmedTimePlacement, 
                true, 
                outputData
            );

            // Notify the renderer process
            console.log('Sending save-complete event to renderer');
            event.reply('save-complete', filePath);

            // Notify the main window
            if (mainWindow) {
                console.log('Notifying main window of completion');
                mainWindow.webContents.send('app-completed', outputData.applicationName);
            } else {
                console.log('Main window not available for notification');
            }
        });

    } catch (error) {
        console.error('Error in save-answers-to-file handler:', error);
        event.reply('save-error', `Failed to save application data: ${error.message}`);
    }
});

// Add a function to load completed apps from the directory
async function loadCompletedAppsFromDirectory() {
    const dir = getCompletedAppsDirectory();
    if (!dir) return;

    try {
        const files = fs.readdirSync(dir);
        completedApps = [];

        for (const file of files) {
            try {
                if (file.endsWith('_app_questions.json') || file.endsWith('_strategy_questions.json')) {
                    const filePath = path.join(dir, file);
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    
                    // Skip if no application name
                    if (!data.applicationName) continue;

                    // Find existing app entry or create new one
                    let appEntry = completedApps.find(app => app.name === data.applicationName);
                    if (!appEntry) {
                        appEntry = {
                            name: data.applicationName,
                            completedOn: new Date().toISOString(),
                            initialTIREPlacement: "Not Set",
                            confirmedTIREPlacement: "Not Set",
                            confirmedPlacementSet: false,
                            previousTIREPlacement: null,
                            appQuestions: null,
                            strategyQuestions: null,
                            summary: null,
                            assessmentHistory: {}
                        };
                        completedApps.push(appEntry);
                    }

                    // Update the appropriate section based on file type
                    if (file.endsWith('_app_questions.json')) {
                        appEntry.appQuestions = data.appQuestions;
                        appEntry.appQuestionsCompleted = true;
                    } else if (file.endsWith('_strategy_questions.json')) {
                        appEntry.strategyQuestions = data.answers;
                        appEntry.initialTIREPlacement = data.initialTimePlacement || "Not Set";
                        appEntry.confirmedTIREPlacement = data.confirmedTimePlacement || "Not Set";
                        appEntry.confirmedPlacementSet = true;
                        appEntry.assessmentHistory = data.assessmentHistory || {};
                    }

                    // Update summary
                    if (data.summary) {
                        appEntry.summary = {
                            ...appEntry.summary,
                            ...data.summary
                        };
                    }
                }
            } catch (error) {
                console.error('Error processing file:', file, error);
                continue;
            }
        }

        console.log(`Loaded ${completedApps.length} applications`);
        console.log('Completed apps:', completedApps);
    } catch (error) {
        console.error('Error loading completed apps:', error);
    }
}

function saveCompletedApps() {
    const completedAppsPath = path.join(app.getPath('userData'), 'completed-apps.json');
    fs.writeFileSync(completedAppsPath, JSON.stringify(completedApps, null, 2), 'utf-8');
}

// Function to copy template file
function copyTemplateFile() {
    // Get template path
    const templatePath = path.join(__dirname, 'templates', 'Application Strategy Export Template.xlsx');
    
    // Validate template exists
    if (!fs.existsSync(templatePath)) {
        throw new Error('Export template file not found at: ' + templatePath);
    }

    // Create export filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(app.getPath('downloads'), `completed-applications-${timestamp}.xlsx`);
    
    // Copy template to destination
    fs.copyFileSync(templatePath, exportPath);
    
    // Verify the file was copied successfully
    if (!fs.existsSync(exportPath)) {
        throw new Error('Failed to copy template file to: ' + exportPath);
    }

    console.log('Template successfully copied to:', exportPath);
    return exportPath;
}

// Function to update exported file with data
function updateExportedFile(exportPath) {
    // Validate export file exists
    if (!fs.existsSync(exportPath)) {
        throw new Error('Export file not found at: ' + exportPath);
    }

    // Open the copied file with full formatting and structure preserved
    const workbook = xlsx.readFile(exportPath, { cellFormula: true, cellStyles: true, bookVBA: true });
    
    // Get the first worksheet (assuming it's the main sheet)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Validate worksheet exists
    if (!worksheet) {
        throw new Error('Could not find worksheet in exported file');
    }

    // Start from row 5 (index 4) to skip the instructions and headers
    let currentRow = 4;

    // Add data to the copied template while preserving formatting
    completedApps.forEach(app => {
        // Add application name to column A
        worksheet[xlsx.utils.encode_cell({r: currentRow, c: 0})] = {
            t: 's',
            v: app.name,
            s: worksheet[xlsx.utils.encode_cell({r: 4, c: 0})]?.s || {} // Copy style from template
        };

        // Add TIRE placement to column B
        const placement = app.confirmedTIREPlacement !== "Not Set" 
            ? app.confirmedTIREPlacement 
            : app.initialTIREPlacement;

        worksheet[xlsx.utils.encode_cell({r: currentRow, c: 1})] = {
            t: 's',
            v: placement || "Not Set",
            s: worksheet[xlsx.utils.encode_cell({r: 4, c: 1})]?.s || {} // Copy style from template
        };

        currentRow++;
    });

    // Save the updated file with all formatting preserved
    const writeOpts = {
        bookType: 'xlsx',
        bookSST: false,
        type: 'file',
        cellStyles: true,
        compression: true
    };

    xlsx.writeFile(workbook, exportPath, writeOpts);
    
    // Verify file still exists after saving
    if (!fs.existsSync(exportPath)) {
        throw new Error('Failed to save updated export file');
    }

    console.log('Successfully updated export file with', completedApps.length, 'applications');
    return true;
}

// Main export function that coordinates the steps
function exportCompletedAppsToExcel() {
    try {
        // Validate if there are any completed apps to export
        if (!completedApps || completedApps.length === 0) {
            throw new Error('No completed applications to export');
        }

        // Get the save directory
        const saveDir = store.get('completedAppsDirectory');
        if (!saveDir) {
            throw new Error('No save directory configured. Please set a directory in the start screen.');
        }

        // Create a new workbook and worksheet
        const workbook = xlsx.utils.book_new();
        const wsData = [];

        // Add headers
        wsData.push(['Application Name', 'Current TIRE Status']);

        // Add data rows
        completedApps.forEach(app => {
            const currentPlacement = app.confirmedTIREPlacement !== "Not Set" 
                ? app.confirmedTIREPlacement 
                : app.initialTIREPlacement;
            
            wsData.push([
                app.name, 
                currentPlacement
            ]);
        });

        // Create worksheet from data
        const worksheet = xlsx.utils.aoa_to_sheet(wsData);

        // Set column widths
        const colWidths = [
            { wch: 30 }, // Application Name
            { wch: 20 }  // Current TIRE Status
        ];
        worksheet['!cols'] = colWidths;

        // Add worksheet to workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Completed Apps');

        // Create export filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportPath = path.join(saveDir, `Completed-Applications-${timestamp}.xlsx`);

        // Ensure the directory exists
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }

        // Save the workbook
        xlsx.writeFile(workbook, exportPath);

        return exportPath;
    } catch (error) {
        console.error('Error in exportCompletedAppsToExcel:', error);
        throw error;
    }
}

// Add IPC handler for exporting completed apps
ipcMain.handle('export-completed-apps', async () => {
    try {
        const exportPath = exportCompletedAppsToExcel();
        return { success: true, path: exportPath };
    } catch (error) {
        console.error('Error exporting completed apps:', error);
        return { success: false, error: error.message };
    }
});

// Add handler to get application data
ipcMain.handle('get-app-data', async (event, appName) => {
    try {
        const dir = getCompletedAppsDirectory();
        if (!dir) {
            console.error('No directory set for loading application data');
            return null;
        }

        const sanitizedAppName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(dir, `${sanitizedAppName}.json`);

        if (fs.existsSync(filePath)) {
            console.log('Loading app data from:', filePath);
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } else {
            console.log('No existing data found for:', appName);
            return null;
        }
    } catch (error) {
        console.error('Error reading application data:', error);
        return null;
    }
});

// Add a new IPC handler to refresh the main window
ipcMain.handle('refresh-main-window', () => {
    if (mainWindow) {
        mainWindow.webContents.send('refresh-data');
    }
    return true;
});

// Function to create a clean export template
function createCleanExportTemplate() {
    try {
        // Get save directory
        const saveDir = store.get('completedAppsDirectory');
        if (!saveDir) {
            throw new Error('No save directory configured. Please set a directory in the start screen.');
        }

        // Get template path
        const templatePath = path.join(__dirname, 'templates', 'Application Strategy Export Template.xlsx');
        
        // Validate template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error('Export template file not found at: ' + templatePath);
        }

        // Create export filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportPath = path.join(saveDir, `Application-Strategy-Export-${timestamp}.xlsx`);
        
        // Ensure the directory exists
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }

        // Copy template to destination
        fs.copyFileSync(templatePath, exportPath);
        
        // Verify the file was copied successfully
        if (!fs.existsSync(exportPath)) {
            throw new Error('Failed to copy template file to: ' + exportPath);
        }

        console.log('Template successfully copied to:', exportPath);
        return { success: true, path: exportPath };
    } catch (error) {
        console.error('Error creating export template:', error);
        return { success: false, error: error.message };
    }
}

// Add IPC handler for creating clean export template
ipcMain.handle('create-export-template', async () => {
    return createCleanExportTemplate();
});

// Store uploaded data
ipcMain.handle('store-uploaded-data', (event, data) => {
    uploadedData = data;
    return true;
});

// Get uploaded data
ipcMain.handle('get-uploaded-data', () => {
    return uploadedData;
});

// Handle returning to start screen
ipcMain.on('return-to-start', () => {
    // Close main window
    if (mainWindow) {
        mainWindow.close();
        mainWindow = null;
    }
    
    // Create new start window
    createStartWindow();
});

// Add this after other window creation functions
function createAdminWindow() {
    adminWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false
    });

    adminWindow.loadFile('admin.html');
    adminWindow.maximize();
    adminWindow.show();

    adminWindow.on('closed', () => {
        adminWindow = null;
    });
}

// Update the IPC handlers for threshold management
ipcMain.handle('get-thresholds', async () => {
    const thresholdsPath = path.join(app.getPath('userData'), 'thresholds.json');
    try {
        // Ensure userData directory exists
        const userDataDir = app.getPath('userData');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        if (fs.existsSync(thresholdsPath)) {
            const data = fs.readFileSync(thresholdsPath, 'utf-8');
            return JSON.parse(data);
        }
        // Default values if file doesn't exist
        const defaults = {
            distributionThreshold: 80,
            tiebreakThreshold: 3
        };
        // Create the file with defaults if it doesn't exist
        fs.writeFileSync(thresholdsPath, JSON.stringify(defaults, null, 2), 'utf-8');
        return defaults;
    } catch (error) {
        console.error('Error reading thresholds:', error);
        return {
            distributionThreshold: 80,
            tiebreakThreshold: 3
        };
    }
});

ipcMain.handle('save-thresholds', async (event, thresholds) => {
    const userDataDir = app.getPath('userData');
    const thresholdsPath = path.join(userDataDir, 'thresholds.json');
    const questionsPath = path.join(__dirname, 'questions.json');
    
    try {
        // Ensure userData directory exists with proper permissions
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { 
                recursive: true, 
                // Set proper permissions for both platforms
                mode: 0o755 
            });
        }

        // Save to thresholds.json with platform-specific error handling
        try {
            // First, try to write to a temporary file
            const tempPath = path.join(userDataDir, `thresholds-${Date.now()}.tmp`);
            fs.writeFileSync(tempPath, JSON.stringify(thresholds, null, 2), 'utf-8');

            // If successful, rename/move the temp file to the actual file
            if (process.platform === 'win32' && fs.existsSync(thresholdsPath)) {
                // Windows requires the destination file to be deleted first
                fs.unlinkSync(thresholdsPath);
            }
            fs.renameSync(tempPath, thresholdsPath);
        } catch (writeError) {
            console.error('Error writing thresholds.json:', writeError);
            throw new Error(`Failed to write thresholds.json: ${writeError.message}`);
        }
        
        // Update questions.json with platform-specific error handling
        try {
            if (fs.existsSync(questionsPath)) {
                const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
                if (questionsData && questionsData[0]) {
                    if (!questionsData[0].config) {
                        questionsData[0].config = {};
                    }
                    questionsData[0].config.distributionThreshold = thresholds.distributionThreshold;
                    questionsData[0].config.tiebreakThreshold = thresholds.tiebreakThreshold;

                    // Use the same temp file approach for questions.json
                    const tempPath = path.join(__dirname, `questions-${Date.now()}.tmp`);
                    fs.writeFileSync(tempPath, JSON.stringify(questionsData, null, 2), 'utf-8');

                    if (process.platform === 'win32' && fs.existsSync(questionsPath)) {
                        fs.unlinkSync(questionsPath);
                    }
                    fs.renameSync(tempPath, questionsPath);
                }
            }
        } catch (questionsError) {
            console.error('Error updating questions.json:', questionsError);
            // Don't throw here, as thresholds.json was already saved
        }

        // Update the global threshold values
        distributionThreshold = thresholds.distributionThreshold;
        tiebreakThreshold = thresholds.tiebreakThreshold;
        
        // Notify all windows of the updated thresholds
        if (mainWindow) {
            mainWindow.webContents.send('thresholds-updated', thresholds);
        }
        if (strategyQuestionsWindow) {
            strategyQuestionsWindow.webContents.send('thresholds-updated', thresholds);
        }
        return true;
    } catch (error) {
        console.error('Error saving thresholds:', error);
        throw error; // Propagate the error with details
    }
});

// Add these IPC handlers for window management
ipcMain.on('open-admin', () => {
    if (adminWindow) {
        adminWindow.focus();
    } else {
        createAdminWindow();
    }
});

ipcMain.on('return-to-main', () => {
    if (adminWindow) {
        adminWindow.close();
    }
    if (mainWindow) {
        mainWindow.focus();
    } else {
        createMainWindow();
    }
});

// Modify the loadDistributionThreshold function to load both thresholds
async function loadThresholds() {
    try {
        const thresholdsPath = path.join(app.getPath('userData'), 'thresholds.json');
        if (fs.existsSync(thresholdsPath)) {
            const thresholdsData = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
            distributionThreshold = thresholdsData.distributionThreshold;
            tiebreakThreshold = thresholdsData.tiebreakThreshold;
        }
    } catch (error) {
        console.error('Error loading thresholds:', error);
    }
}

// Modify the app.whenReady() section
app.whenReady().then(async () => {
    await loadCompletedAppsFromDirectory();
    loadThresholds();
    createStartWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createStartWindow();
    }
});

// Add these IPC handlers for directory management
ipcMain.handle('open-directory', async (event, dirPath) => {
    try {
        await require('electron').shell.openPath(dirPath);
        return true;
    } catch (error) {
        console.error('Error opening directory:', error);
        return false;
    }
});

ipcMain.handle('reset-completed-apps', async () => {
    completedApps = [];
    await loadCompletedAppsFromDirectory();
    return true;
});

// Add handler for saving strategy questions
ipcMain.on('save-strategy-questions', (event, outputData) => {
    try {
        const dir = getCompletedAppsDirectory();
        if (!dir) {
            dialog.showMessageBoxSync({
                type: 'error',
                title: 'Save Failed',
                message: 'No directory set for saving completed applications. Please set a directory in the admin settings.'
            });
            return;
        }

        const sanitizedAppName = outputData.applicationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(dir, `${sanitizedAppName}_strategy_questions.json`);

        // Save the file
        fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2), 'utf-8');
        
        // Update the completedApps array with the data
        markAppCompleted(outputData.applicationName, 
            outputData.initialTimePlacement, 
            outputData.confirmedTimePlacement, 
            true, 
            outputData);

        // Notify the main window
        if (mainWindow) {
            mainWindow.webContents.send('app-completed', outputData.applicationName);
        }

        event.reply('save-status', 'File saved successfully');
    } catch (error) {
        console.error('Error saving file:', error);
        dialog.showMessageBoxSync({
            type: 'error',
            title: 'Save Failed',
            message: `Failed to save application data: ${error.message}`
        });
    }
});

// Save selected directory
ipcMain.handle('save-directory', (event, dirPath) => {
    store.set('saveDirectory', dirPath);
    return true;
});

// Handle reset confirmation
ipcMain.handle('confirm-reset', async () => {
    const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Reset Application',
        message: 'Are you sure you want to reset the application?',
        detail: 'This will remove all saved assessments and settings. This action cannot be undone.',
        buttons: ['Cancel', 'Reset'],
        defaultId: 0,
        cancelId: 0
    });
    
    return result.response === 1;
});

// Handle application reset
ipcMain.handle('reset-application', async () => {
    try {
        // Get the completed apps directory before clearing store
        const completedAppsDir = getCompletedAppsDirectory();
        
        // Clear electron-store data
        store.clear();
        
        if (completedAppsDir && fs.existsSync(completedAppsDir)) {
            // Remove all JSON files in the directory
            const files = fs.readdirSync(completedAppsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(completedAppsDir, file);
                    try {
                        fs.unlinkSync(filePath);
                        console.log('Deleted file:', filePath);
                    } catch (err) {
                        console.error('Error deleting file:', filePath, err);
                    }
                }
            }
        }
        
        // Reset application state
        completedApps = [];
        uploadedData = null;
        
        // Reset thresholds to defaults
        store.set('distributionThreshold', 80);
        store.set('tiebreakThreshold', 3);
        
        // Clear the completed apps directory setting
        store.delete('completedAppsDirectory');
        
        // Notify windows to refresh
        if (mainWindow) {
            mainWindow.webContents.send('refresh-data');
        }
        
        return true;
    } catch (error) {
        console.error('Error resetting application:', error);
        throw error;
    }
});

// Add this IPC handler near other IPC handlers
ipcMain.on('quit-app', () => {
    app.quit();
});

// Initialize logging
function initializeLogging() {
    const baseDir = store.get('completedAppsDirectory');
    if (!baseDir) {
        console.error('No save directory configured');
        return null;
    }
    
    const logsDir = path.join(baseDir, 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    return logsDir;
}

// Get log file path for the current day
function getLogFilePath(logsDir) {
    if (!logsDir) return null;
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `tire-app-${date}.log`);
}

// Add write-to-log handler
ipcMain.handle('write-to-log', async (event, logEntry) => {
    try {
        const logsDir = initializeLogging();
        if (!logsDir) {
            console.error('Could not initialize logging directory');
            return false;
        }
        
        const logFile = getLogFilePath(logsDir);
        if (!logFile) {
            console.error('Could not generate log file path');
            return false;
        }
        
        // Format the log entry
        const formattedLog = `${logEntry.timestamp} [${logEntry.level}] ${logEntry.message}${logEntry.data ? '\nData: ' + logEntry.data : ''}\n`;
        
        // Append to log file
        fs.appendFileSync(logFile, formattedLog);
        return true;
    } catch (error) {
        console.error('Error writing to log file:', error);
        return false;
    }
});

// Add function to load app questions
function loadAppQuestions() {
    try {
        const questionsPath = path.join(__dirname, 'app-questions.json');
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        return questionsData;
    } catch (error) {
        console.error('Error loading app-questions.json:', error);
        return null;
    }
}

// Open application questions window
ipcMain.on('open-app-questions-window', (event, appName) => {
    if (appQuestionsWindow) {
        appQuestionsWindow.focus();
        // If window exists, update it with the new app name
        appQuestionsWindow.webContents.send('app-name', appName);
        return;
    }

    appQuestionsWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false  // Don't show until we maximize
    });

    appQuestionsWindow.maximize();  // Maximize the window
    appQuestionsWindow.show();      // Show after maximizing

    appQuestionsWindow.loadFile('app-questions.html').then(() => {
        // Load app questions and send them along with the app name
        const appQuestions = loadAppQuestions();
        if (appQuestions) {
            appQuestionsWindow.webContents.send('app-questions-data', appQuestions);
        }
        appQuestionsWindow.webContents.send('app-name', appName);
    });

    appQuestionsWindow.on('closed', () => {
        appQuestionsWindow = null;
    });
});

// Add handler to get app questions data
ipcMain.handle('get-app-questions', async () => {
    return loadAppQuestions();
});

// Handle saving application questions
ipcMain.handle('save-app-questions', async (event, outputData) => {
    try {
        // Get the directory for saving completed applications
        const dir = getCompletedAppsDirectory();
        if (!dir) {
            return {
                success: false,
                message: 'No directory set for saving completed applications. Please set a directory in the admin settings.'
            };
        }

        // Sanitize the application name for use in filename
        const sanitizedAppName = outputData.applicationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        // Append _app_questions to the filename
        const filePath = path.join(dir, `${sanitizedAppName}_app_questions.json`);

        // Create the output data with the correct structure
        const saveData = {
            applicationName: outputData.applicationName,
            appQuestions: outputData.appQuestions, // This should contain all the question answers
            timestamp: new Date().toISOString(),
            summary: {
                totalQuestions: outputData.summary.totalQuestions,
                answeredQuestions: outputData.summary.answeredQuestions,
                isCompleted: outputData.summary.isCompleted
            }
        };

        // Save the file
        fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2), 'utf-8');
        
        // Update the completedApps array
        const appIndex = completedApps.findIndex(app => app.name === outputData.applicationName);
        if (appIndex >= 0) {
            completedApps[appIndex].appQuestions = outputData.appQuestions;
            completedApps[appIndex].appQuestionsCompleted = true;
        } else {
            completedApps.push({
                name: outputData.applicationName,
                appQuestions: outputData.appQuestions,
                appQuestionsCompleted: true,
                completedOn: new Date().toISOString()
            });
        }

        // Notify the main window
        if (mainWindow) {
            mainWindow.webContents.send('app-completed', outputData.applicationName);
        }

        return {
            success: true,
            message: 'Application questions saved successfully',
            filePath: filePath
        };
    } catch (error) {
        console.error('Error saving application questions:', error);
        return {
            success: false,
            message: `Failed to save application questions: ${error.message}`
        };
    }
});

// Handle closing application questions window
ipcMain.on('close-app-questions', () => {
    if (appQuestionsWindow) {
        appQuestionsWindow.close();
        appQuestionsWindow = null;
    }
});

// Add handler to get strategy questions data
ipcMain.handle('get-strategy-questions', async () => {
    return loadStrategyQuestions();
});

// Function to export app questions to CSV
function exportAppQuestionsToExcel() {
    console.log('Starting app questions export...');
    try {
        // Get the save directory
        const saveDir = store.get('completedAppsDirectory');
        if (!saveDir) {
            throw new Error('No save directory configured. Please set a directory in the start screen.');
        }

        // Get all JSON files in the directory
        const files = fs.readdirSync(saveDir);
        const appQuestionFiles = files.filter(file => file.endsWith('_app_questions.json'));

        if (!appQuestionFiles || appQuestionFiles.length === 0) {
            throw new Error('No completed application questions found to export');
        }

        // Create data structure to hold all questions and answers
        const allQuestions = new Set();
        const appData = new Map(); // Map of app name to its answers

        // First pass: collect all possible questions and app data
        for (const file of appQuestionFiles) {
            try {
                const filePath = path.join(saveDir, file);
                const rawData = fs.readFileSync(filePath, 'utf-8');
                const fileData = JSON.parse(rawData);

                if (!fileData || !fileData.applicationName || !fileData.appQuestions) continue;

                const appName = fileData.applicationName;
                appData.set(appName, fileData.appQuestions);

                // Collect all possible questions
                Object.keys(fileData.appQuestions).forEach(question => {
                    if (question !== 'application') {
                        allQuestions.add(question);
                    }
                });
            } catch (error) {
                console.error('Error processing file:', file, error);
                continue;
            }
        }

        // Convert questions set to sorted array
        const questionsList = Array.from(allQuestions).sort();

        // Create CSV content array
        const csvRows = [];
        
        // Add header row with application names
        const headerRow = ['Question ID'];
        appData.forEach((_, appName) => {
            headerRow.push(appName);
        });
        csvRows.push(headerRow.join(','));

        // Add data rows
        questionsList.forEach(question => {
            const row = [question];
            appData.forEach((answers) => {
                let value = answers[question];
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                row.push(escapeCSV(value || ''));
            });
            csvRows.push(row.join(','));
        });

        // Create export filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportPath = path.join(saveDir, `App-Questions-Export-${timestamp}.csv`);
        
        // Write CSV file
        fs.writeFileSync(exportPath, csvRows.join('\n'), 'utf-8');
        console.log('Export completed successfully');

        return { success: true, path: exportPath };
    } catch (error) {
        console.error('Error in exportAppQuestionsToExcel:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to escape CSV values
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = value.toString();
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Escape quotes by doubling them and wrap in quotes
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

// Add IPC handler for loading app questions
ipcMain.handle('load-app-questions', async () => {
    try {
        const questions = loadAppQuestions();
        if (questions) {
            return { success: true, data: questions };
        } else {
            return { success: false, error: 'Failed to load questions' };
        }
    } catch (error) {
        console.error('Error in load-app-questions handler:', error);
        return { success: false, error: error.message };
    }
});
