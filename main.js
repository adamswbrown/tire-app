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
            const headers = ['Server', 'Assessment Scope', 'Application Name', 'Environment', 'Data Center'];
            const data = xlsx.utils.sheet_to_json(worksheet, { header: headers, range: 4 });
            return data;
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

// Save answers to file and mark app as completed
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
            markAppCompleted(outputData.applicationName, initialPlacement, confirmedPlacement, confirmedPlacementSet);
            saveCompletedApps();
            if (strategyQuestionsWindow) strategyQuestionsWindow.close();
            event.reply('save-status', 'File saved successfully');
        }
    });
});

function markAppCompleted(appName, initialPlacement, confirmedPlacement, confirmedPlacementSet) {
    if (!completedApps.some(app => app.name === appName)) {
        completedApps.push({
            name: appName,
            completedOn: new Date().toISOString(),
            initialTIREPlacement: initialPlacement || "Not Set",
            confirmedTIREPlacement: confirmedPlacement || "Not Set",
            confirmedPlacementSet
        });
    }
}

function saveCompletedApps() {
    const completedAppsPath = path.join(app.getPath('userData'), 'completed-apps.json');
    fs.writeFileSync(completedAppsPath, JSON.stringify(completedApps, null, 2), 'utf-8');
}

app.whenReady().then(() => {
    resetCompletedAppsFile();
    loadCompletedApps();
    loadDistributionThreshold();
    createMainWindow();
});
