const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

let mainWindow;
let inScopeWindow;
let strategyQuestionsWindow = null;

ipcMain.on('open-strategy-questions-window', (event, appName) => {
    // If the window is already open, bring it to the front
    if (strategyQuestionsWindow) {
        strategyQuestionsWindow.focus();
        return;
    }

    // Create the Strategy Questions window
    strategyQuestionsWindow = new BrowserWindow({
        width: 2559,
        height: 1048,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    strategyQuestionsWindow.loadFile('strategy-questions.html');

    // Send the application name to the new window once it's ready
    strategyQuestionsWindow.webContents.on('did-finish-load', () => {
        strategyQuestionsWindow.webContents.send('set-application-name', appName);
    });

    // Set strategyQuestionsWindow to null when the window is closed
    strategyQuestionsWindow.on('closed', () => {
        strategyQuestionsWindow = null;
    });
});


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1917,
        height: 838,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');
}

app.on('ready', createWindow);

ipcMain.on('upload-file', async (event) => {
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
                range: 4,  // Start reading data from row 5, treating row 4 as headers
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
});

ipcMain.on('open-in-scope-window', () => {
    if (inScopeWindow) {
        // If the window is already open, focus on it
        inScopeWindow.focus();
    } else {
        // Create the in-scope applications window if it doesn't exist
        inScopeWindow = new BrowserWindow({
            width: 1917,
            height: 838,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        inScopeWindow.loadFile('in-scope.html');

        // Set the inScopeWindow variable to null when the window is closed
        inScopeWindow.on('closed', () => {
            inScopeWindow = null;
        });
    }
});

ipcMain.handle('get-in-scope-data', () => {
    return app.inScopeData || [];
});
