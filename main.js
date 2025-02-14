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
            // Get the range of the worksheet
            const range = xlsx.utils.decode_range(worksheet['!ref']);
            
            // Read headers from row 4 (1-based)
            const headers = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
                const headerCell = worksheet[xlsx.utils.encode_cell({r: 3, c: C})]; // row 4 is index 3
                if (headerCell) headers[C] = headerCell.v;
            }
            
            console.log('All Excel Headers:', headers);

            // Find the correct column indices
            const serverIndex = headers.findIndex(h => h === 'Server');
            const scopeIndex = headers.findIndex(h => h === 'Assessment Scope');
            const appNameIndex = headers.findIndex(h => h === 'Application Name');
            const envIndex = headers.findIndex(h => h === 'Environment');
            const dataCenterIndex = headers.findIndex(h => h === 'Data Center');

            console.log('Column indices:', {
                server: serverIndex,
                scope: scopeIndex,
                appName: appNameIndex,
                env: envIndex,
                dataCenter: dataCenterIndex
            });

            // Read all rows starting from row 5
            const rows = [];
            for (let R = 4; R <= range.e.r; R++) { // Start from row 5 (index 4)
                const row = {};
                for (let C = 0; C < headers.length; C++) {
                    const cell = worksheet[xlsx.utils.encode_cell({r: R, c: C})];
                    row[headers[C]] = cell ? cell.v : '';
                }
                rows.push(row);
            }

            console.log('First row raw data:', rows[0]);

            // Transform the data using the correct column headers
            const transformedData = rows.map(row => {
                return {
                    'Application Name': row['Application Name'] || '',
                    'Assessment Scope': row['Assessment Scope'] || '',
                    'Data Center': row['Data Center'] || '',
                    'Environment': row['Environment'] || '',
                    'Server': row['Server'] || ''
                };
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
    try {
        // Validate if there are any completed apps to export
        if (!completedApps || completedApps.length === 0) {
            throw new Error('No completed applications to export');
        }

        console.log(`Starting export of ${completedApps.length} completed applications`);

        // Get template path
        const templatePath = path.join(__dirname, 'templates', 'Application Strategy Export Template.xlsx');
        
        // Validate template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error('Export template file not found');
        }

        // Create export filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportPath = path.join(app.getPath('downloads'), `completed-applications-${timestamp}.xlsx`);
        
        // Copy template to destination
        fs.copyFileSync(templatePath, exportPath);
        console.log('Template copied to:', exportPath);

        // Open the copied file
        const workbook = xlsx.readFile(exportPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Start from row 5 (index 4) to skip the instructions and headers
        let currentRow = 4;

        // Add data to the copied template
        completedApps.forEach(app => {
            // Add application name to column A
            worksheet[xlsx.utils.encode_cell({r: currentRow, c: 0})] = {
                t: 's',
                v: app.name
            };

            // Add TIRE placement to column B
            const placement = app.confirmedTIREPlacement !== "Not Set" 
                ? app.confirmedTIREPlacement 
                : app.initialTIREPlacement;

            worksheet[xlsx.utils.encode_cell({r: currentRow, c: 1})] = {
                t: 's',
                v: placement || "Not Set"
            };

            currentRow++;
        });

        // Save the updated file
        xlsx.writeFile(workbook, exportPath);

        console.log('Export completed successfully:', {
            totalApps: completedApps.length,
            exportPath
        });

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
