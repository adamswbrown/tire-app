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

        try {
            await ipcRenderer.invoke('save-thresholds', thresholds);
            alert('Thresholds saved successfully');
            // Return to main window after successful save
            ipcRenderer.send('return-to-main');
        } catch (saveError) {
            console.error('Error saving thresholds:', saveError);
            
            // Provide platform-specific guidance
            let errorMessage = `Error saving thresholds: ${saveError.message}\n\n`;
            if (process.platform === 'win32') {
                errorMessage += 'Please ensure you have write permissions to the AppData directory.';
            } else {
                errorMessage += 'Please ensure you have write permissions to the Application Support directory.';
            }
            
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error in saveThresholds:', error);
        alert(`An unexpected error occurred: ${error.message}`);
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