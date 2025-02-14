const { ipcRenderer } = require('electron');

// Get DOM elements
const distributionThresholdInput = document.getElementById('distributionThreshold');
const tiebreakThresholdInput = document.getElementById('tiebreakThreshold');
const saveButton = document.getElementById('saveThresholds');
const backButton = document.getElementById('backToMain');

// Load current thresholds
async function loadThresholds() {
    try {
        const thresholds = await ipcRenderer.invoke('get-thresholds');
        distributionThresholdInput.value = thresholds.distributionThreshold || 80;
        tiebreakThresholdInput.value = thresholds.tiebreakThreshold || 3;
    } catch (error) {
        console.error('Error loading thresholds:', error);
    }
}

// Save thresholds
async function saveThresholds() {
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

        const success = await ipcRenderer.invoke('save-thresholds', thresholds);
        if (success) {
            alert('Thresholds saved successfully');
            // Return to main window after successful save
            ipcRenderer.send('return-to-main');
        } else {
            alert('Error saving thresholds');
        }
    } catch (error) {
        console.error('Error saving thresholds:', error);
        alert('Error saving thresholds');
    }
}

// Return to main window
function returnToMain() {
    console.log('Returning to main window');
    ipcRenderer.send('return-to-main');
}

// Add event listeners
saveButton.addEventListener('click', saveThresholds);
backButton.addEventListener('click', returnToMain);

// Load thresholds when page loads
document.addEventListener('DOMContentLoaded', loadThresholds); 