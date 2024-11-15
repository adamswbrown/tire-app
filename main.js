const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

let mainWindow;
let strategyQuestionsWindow = null;
let explanationWindow = null; // Declare the explanation window variable
let distributionThreshold = 80; // Set a default value

// Load the questions.json to extract the distributionThreshold
function loadDistributionThreshold() {
    try {
        const questionsPath = path.join(__dirname, 'questions.json'); // Update with correct path
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        if (questionsData && questionsData[0] && questionsData[0].config) {
            distributionThreshold = questionsData[0].config.distributionThreshold;
        }
    } catch (error) {
        console.error('Error loading questions.json:', error);
    }
}

// Call the function to load the distributionThreshold when the app is ready
app.whenReady().then(() => {
    loadDistributionThreshold(); // Ensure this is called when the app starts
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

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

    mainWindow.loadFile('index.html')
        .catch(err => console.error('Error loading index.html:', err));
}

// Create the strategy questions window
function createStrategyQuestionsWindow(appName) {
    if (strategyQuestionsWindow) {
        strategyQuestionsWindow.focus();
        return;
    }

    strategyQuestionsWindow = new BrowserWindow({
        width: 2559,
        height: 1048,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    strategyQuestionsWindow.loadFile('strategy-questions.html')
        .catch(err => console.error('Error loading strategy-questions.html:', err));

    strategyQuestionsWindow.webContents.on('did-finish-load', () => {
        strategyQuestionsWindow.webContents.send('set-application-name', appName);
        strategyQuestionsWindow.webContents.send('set-distribution-threshold', distributionThreshold); // Send the threshold value
    });

    strategyQuestionsWindow.on('closed', () => {
        strategyQuestionsWindow = null;
    });
}

// Create the calculations explained window
function createCalculationsWindow() {
    if (explanationWindow && !explanationWindow.isDestroyed()) {
        explanationWindow.focus();
        return;
    }

    explanationWindow = new BrowserWindow({
        width: 1470,
        height: 553,
        title: 'Calculations Explained',
        webPreferences: {
            nodeIntegration: true,
        }
    });

    explanationWindow.loadFile('calculations-explained.html');
    explanationWindow.webContents.on('did-finish-load', () => {
        explanationWindow.webContents.send('set-threshold', distributionThreshold); // Send the threshold value
    });

    explanationWindow.on('closed', () => {
        explanationWindow = null;
    });
}

// Listen for the message to open the new window
ipcMain.on('open-calculations-explained', () => {
    createCalculationsWindow();
    explanationWindow.show();
});

// Open the strategy questions window
ipcMain.on('open-strategy-questions-window', (event, appName) => {
    createStrategyQuestionsWindow(appName);
});

// Save answers to file
ipcMain.on('save-answers-to-file', (event, outputData) => {
    const appName = outputData.applicationName || 'strategy-questions-output';
    const sanitizedAppName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    dialog.showSaveDialog({
        title: 'Save Strategy Questions Data',
        defaultPath: path.join(app.getPath('documents'), `${sanitizedAppName}.json`),
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    }).then(file => {
        if (!file.canceled && file.filePath) {
            fs.writeFile(file.filePath.toString(), JSON.stringify(outputData, null, 2), (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                    event.reply('save-status', 'Error saving file');
                } else {
                    console.log('File successfully saved:', file.filePath);
                    event.reply('save-status', 'File saved successfully');
                }
            });
        } else {
            event.reply('save-status', 'Save operation canceled');
        }
    }).catch(err => {
        console.error('Error during save dialog:', err);
        event.reply('save-status', 'Error during save dialog');
    });
});

// Upload an Excel file and process it
ipcMain.on('upload-file', async (event) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            properties: ['openFile'],
        });

        if (!canceled && filePaths.length > 0) {
            const filePath = filePaths[0];
            const workbook = xlsx.readFile(filePath);
            const sheetName = 'App-to-Server List';
            const worksheet = workbook.Sheets[sheetName];

            if (worksheet) {
                const headers = [
                    'Server',
                    'Assessment Scope',
                    'Application Name',
                    'Environment',
                    'Power Status',
                    'Operating System',
                    'Data Center',
                    'SQL Detected',
                    'VMWare Description'
                ];

                const data = xlsx.utils.sheet_to_json(worksheet, {
                    header: headers,
                    range: 4,
                });

                const jsonFilePath = path.join(app.getPath('userData'), 'appToServerData.json');
                fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');

                const inScopeData = data.filter(row => row['Assessment Scope'] === 'In Scope');
                app.inScopeData = inScopeData;

                event.reply('upload-complete', data);
            } else {
                event.reply('upload-complete', { error: 'Sheet not found' });
            }
        }
    } catch (err) {
        console.error('Error processing upload file:', err);
        event.reply('upload-complete', { error: 'Error processing file' });
    }
});

// Handle in-scope data request
ipcMain.handle('get-in-scope-data', () => {
    return app.inScopeData || [];
});
