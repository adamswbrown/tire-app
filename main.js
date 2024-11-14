const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

let mainWindow;
let inScopeWindow;
let strategyQuestionsWindow = null;

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

    // Wait until the content is loaded, then send the application name
    strategyQuestionsWindow.webContents.on('did-finish-load', () => {
        strategyQuestionsWindow.webContents.send('set-application-name', appName);
    });

    strategyQuestionsWindow.on('closed', () => {
        strategyQuestionsWindow = null;
    });
}

function createInScopeWindow() {
    if (inScopeWindow) {
        inScopeWindow.focus();
        return;
    }

    inScopeWindow = new BrowserWindow({
        width: 1917,
        height: 838,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    inScopeWindow.loadFile('in-scope.html')
        .catch(err => console.error('Error loading in-scope.html:', err));

    inScopeWindow.on('closed', () => {
        inScopeWindow = null;
    });
}


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
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

// Open the in-scope window
ipcMain.on('open-in-scope-window', createInScopeWindow);

// Handle in-scope data request
ipcMain.handle('get-in-scope-data', () => {
    return app.inScopeData || [];
});

// Initialize main window when app is ready
app.whenReady().then(createMainWindow);