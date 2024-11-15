const { ipcRenderer } = require('electron');

// Listen for the 'set-threshold' message and update the page
ipcRenderer.on('set-threshold', (event, threshold) => {
    // Display the threshold value
    document.getElementById('threshold-value').textContent = threshold;

    // Update the explanation about what happens when the threshold is reached
    document.getElementById('threshold-explanation').textContent = `The current distribution threshold is set to ${threshold}%. When the client score distribution reaches or exceeds this threshold, specific actions may be triggered within the application to ensure the system's optimal performance and stability.`;
});
