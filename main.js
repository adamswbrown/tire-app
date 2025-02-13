const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

let mainWindow;
let strategyQuestionsWindow = null;
let explanationWindow = null;
let distributionThreshold = 80;
let completedApps = [];

// Clear completed apps file when the app launches
function resetCompletedAppsFile() {
    const completedAppsPath = path.join(app.getPath('userData'), 'completed-apps.json');
    try {
        fs.writeFileSync(completedAppsPath, JSON.stringify([], null, 2), 'utf-8');
        console.log('Completed apps file has been reset.');
    } catch (error) {
        console.error('Error resetting completed apps file:', error);
    }
}

// Load completed apps into memory
function loadCompletedApps() {
    const completedAppsPath = path.join(app.getPath('userData'), 'completed-apps.json');
    try {
        if (fs.existsSync(completedAppsPath)) {
            const data = fs.readFileSync(completedAppsPath, 'utf-8');
            completedApps = JSON.parse(data);
        } else {
            completedApps = [];
        }
    } catch (error) {
        console.error('Error loading completed apps file:', error);
        completedApps = [];
    }
}

// Load the questions.json to extract the distributionThreshold
function loadDistributionThreshold() {
    try {
        const questionsPath = path.join(__dirname, 'questions.json');
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        if (questionsData && questionsData[0] && questionsData[0].config) {
            distributionThreshold = questionsData[0].config.distributionThreshold;
        }
    } catch (error) {
        console.error('Error loading questions.json:', error);
    }
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
    });

    mainWindow.loadFile('index.html').catch(err => console.error('Error loading index.html:', err));
}

// Expose completed apps list to renderer process
ipcMain.handle('get-completed-apps', () => {
    return completedApps.map(app => app.name);
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
            // First, let's read the raw data to see the actual headers
            const rawData = xlsx.utils.sheet_to_json(worksheet, { 
                header: 1,  // Get array of arrays with raw values
                range: 4,   // Start from row 4
                defval: ''
            });

            console.log('Raw Excel Headers:', rawData[0]); // Log the headers

            // Define the expected headers and their mappings based on actual Excel structure
            const headerMap = {
                'Server Name': 'Server',
                'Assessment Scope': 'Assessment Scope',
                'Application Name': 'Application Name',
                'Environment': 'Environment',
                'Location': 'Data Center'  // Update based on actual Excel column name
            };

            // Read the data with header mapping
            const data = xlsx.utils.sheet_to_json(worksheet, { 
                range: 4,
                defval: ''
            });

            console.log('Sample Row:', data[0]); // Log first row to verify structure

            // Transform the data to use our desired field names
            const transformedData = data.map(row => ({
                'Application Name': row['Application Name'] || '',
                'Assessment Scope': row['Assessment Scope'] || '',
                'Data Center': row['Location'] || '',  // Map from Location to Data Center
                'Environment': row['Environment'] || '',
                'Server': row['Server Name'] || ''
            }));

            console.log('Transformed Row:', transformedData[0]); // Log transformed data

            return transformedData;
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
    });

    strategyQuestionsWindow.loadFile('strategy-questions.html').then(() => {
        strategyQuestionsWindow.webContents.send('set-application-name', appName);
        strategyQuestionsWindow.webContents.send('set-distribution-threshold', distributionThreshold);
    });

    strategyQuestionsWindow.on('closed', () => {
        strategyQuestionsWindow = null;
    });
});

// Modify the markAppCompleted function to store full application data
function markAppCompleted(appName, initialPlacement, confirmedPlacement, confirmedPlacementSet, fullData) {
    const existingAppIndex = completedApps.findIndex(app => app.name === appName);
    const appData = {
        name: appName,
        completedOn: new Date().toISOString(),
        initialTIREPlacement: initialPlacement || "Not Set",
        confirmedTIREPlacement: confirmedPlacement || "Not Set",
        confirmedPlacementSet,
        answers: fullData.answers,
        summary: fullData.summary
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

// Modify the save-answers-to-file handler
ipcMain.on('save-answers-to-file', (event, outputData) => {
    const appName = outputData.applicationName || 'strategy-questions-output';
    const sanitizedAppName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    let TIREPlacement = "Not Set";
    const initialPlacement = outputData.initialTimePlacement?.trim();
    const confirmedPlacement = outputData.confirmedTimePlacement?.trim();
    let confirmedPlacementSet = false;

    if (confirmedPlacement && !confirmedPlacement.toLowerCase().includes("below threshold")) {
        TIREPlacement = confirmedPlacement;
        confirmedPlacementSet = true;
    } else if (initialPlacement) {
        TIREPlacement = initialPlacement;
    } else {
        dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Incomplete Placement',
            message: 'Please set an Initial TIRE Placement or Confirmed TIRE Placement.'
        });
        return;
    }

    dialog.showSaveDialog({
        title: 'Save Strategy Questions Data',
        defaultPath: path.join(app.getPath('documents'), `${sanitizedAppName}.json`),
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    }).then(file => {
        if (!file.canceled && file.filePath) {
            fs.writeFileSync(file.filePath, JSON.stringify(outputData, null, 2), 'utf-8');
            markAppCompleted(outputData.applicationName, initialPlacement, confirmedPlacement, confirmedPlacementSet, outputData);
            saveCompletedApps();
            
            // Notify the main window that an app has been completed
            if (mainWindow) {
                mainWindow.webContents.send('app-completed', outputData.applicationName);
            }
            
            if (strategyQuestionsWindow) {
                strategyQuestionsWindow.close();
            }
            event.reply('save-status', 'File saved successfully');
        }
    });
});

function saveCompletedApps() {
    const completedAppsPath = path.join(app.getPath('userData'), 'completed-apps.json');
    fs.writeFileSync(completedAppsPath, JSON.stringify(completedApps, null, 2), 'utf-8');
}

// Function to export completed apps to Excel
function exportCompletedAppsToExcel() {
    const wb = xlsx.utils.book_new();
    const wsData = completedApps.map(app => ({
        'Application Name': app.name,
        'TIRE Status': app.confirmedTIREPlacement !== "Not Set" ? app.confirmedTIREPlacement : app.initialTIREPlacement
    }));
    
    const ws = xlsx.utils.json_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Completed Applications');
    
    const exportPath = path.join(app.getPath('downloads'), 'completed-applications.xlsx');
    xlsx.writeFile(wb, exportPath);
    return exportPath;
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

// Add new IPC handler to get full application data
ipcMain.handle('get-app-data', (event, appName) => {
    const appData = completedApps.find(app => app.name === appName);
    return appData || null;
});

// Add a new IPC handler to refresh the main window
ipcMain.handle('refresh-main-window', () => {
    if (mainWindow) {
        mainWindow.webContents.send('refresh-data');
    }
    return true;
});

app.whenReady().then(() => {
    resetCompletedAppsFile();
    loadCompletedApps();
    loadDistributionThreshold();
    createMainWindow();
});
