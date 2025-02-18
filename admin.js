const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const store = new Store();

// Get DOM elements
const distributionThresholdInput = document.getElementById('distributionThreshold');
const tiebreakThresholdInput = document.getElementById('tiebreakThreshold');
const saveBtn = document.getElementById('saveBtn');
const returnToMainBtn = document.getElementById('returnToMainBtn');
const changeDirBtn = document.getElementById('changeDirBtn');
const saveDirectoryPath = document.getElementById('saveDirectoryPath');
const directoryChangeModal = document.getElementById('directoryChangeModal');
const cancelDirChangeBtn = document.getElementById('cancelDirChangeBtn');
const confirmDirChangeBtn = document.getElementById('confirmDirChangeBtn');
const resetAppBtn = document.getElementById('resetAppBtn');
const resetConfirmModal = document.getElementById('resetConfirmModal');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const confirmResetBtn = document.getElementById('confirmResetBtn');

// Load current thresholds and directory
async function loadSettings() {
    try {
        // Load thresholds
        const thresholds = await ipcRenderer.invoke('get-thresholds');
        if (distributionThresholdInput) {
            distributionThresholdInput.value = thresholds.distributionThreshold || 80;
        }
        if (tiebreakThresholdInput) {
            tiebreakThresholdInput.value = thresholds.tiebreakThreshold || 3;
        }

        // Load save directory
        const dir = store.get('completedAppsDirectory');
        if (saveDirectoryPath && dir) {
            saveDirectoryPath.value = dir;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Error loading settings');
    }
}

// Save thresholds
async function saveSettings() {
    try {
        const thresholds = {
            distributionThreshold: parseInt(distributionThresholdInput.value),
            tiebreakThreshold: parseInt(tiebreakThresholdInput.value)
        };

        // Validate input
        if (thresholds.distributionThreshold < 0 || thresholds.distributionThreshold > 100) {
            alert('Distribution threshold must be between 0 and 100');
            return;
        }
        if (thresholds.tiebreakThreshold < 0 || thresholds.tiebreakThreshold > 20) {
            alert('Tiebreaker threshold must be between 0 and 20');
            return;
        }

        await ipcRenderer.invoke('save-thresholds', thresholds);
        alert('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
}

// Directory management functions
async function handleDirectoryChange() {
    try {
        const result = await ipcRenderer.invoke('select-directory');
        if (result.path) {
            store.set('completedAppsDirectory', result.path);
            saveDirectoryPath.value = result.path;
            
            // Reset completed apps with new directory
            await ipcRenderer.invoke('reset-completed-apps');
            
            // Hide the modal
            hideDirectoryChangeModal();
            
            // Show success message
            alert('Directory changed successfully. Application data will be loaded from the new location.');
        }
    } catch (error) {
        console.error('Error changing directory:', error);
        alert(`Error changing directory: ${error.message}`);
        hideDirectoryChangeModal();
    }
}

function showDirectoryChangeModal() {
    directoryChangeModal.classList.add('show');
}

function hideDirectoryChangeModal() {
    directoryChangeModal.classList.remove('show');
}

// Reset functionality
function showResetModal() {
    resetConfirmModal.classList.add('show');
}

function hideResetModal() {
    resetConfirmModal.classList.remove('show');
}

async function handleReset() {
    try {
        const success = await ipcRenderer.invoke('reset-application');
        if (success) {
            hideResetModal();
            alert('Application has been reset successfully. The application will now close.');
            // Close the application
            ipcRenderer.send('quit-app');
        }
    } catch (error) {
        console.error('Error resetting application:', error);
        alert(`Error resetting application: ${error.message}`);
        hideResetModal();
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    if (returnToMainBtn) {
        returnToMainBtn.addEventListener('click', () => {
            ipcRenderer.send('return-to-main');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    if (changeDirBtn) {
        changeDirBtn.addEventListener('click', showDirectoryChangeModal);
    }

    if (cancelDirChangeBtn) {
        cancelDirChangeBtn.addEventListener('click', hideDirectoryChangeModal);
    }

    if (confirmDirChangeBtn) {
        confirmDirChangeBtn.addEventListener('click', handleDirectoryChange);
    }

    // Reset button event listeners
    if (resetAppBtn) {
        resetAppBtn.addEventListener('click', showResetModal);
    }

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', hideResetModal);
    }

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', handleReset);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === directoryChangeModal) {
            hideDirectoryChangeModal();
        }
        if (event.target === resetConfirmModal) {
            hideResetModal();
        }
    });
}); 