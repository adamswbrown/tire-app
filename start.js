const { ipcRenderer } = require('electron');

// Get DOM elements
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const statusMessage = document.getElementById('statusMessage');

// Handle drag and drop events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    
    // Handle the dropped file
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload();
    }
});

// Handle click upload
uploadBtn.addEventListener('click', () => {
    handleFileUpload();
});

// Function to handle file upload
async function handleFileUpload() {
    try {
        statusMessage.textContent = 'Processing file...';
        statusMessage.className = 'status-message';
        
        const result = await ipcRenderer.invoke('upload-file');
        
        if (result.error) {
            statusMessage.textContent = result.error;
            statusMessage.className = 'status-message error';
            return;
        }

        // Store the uploaded data
        await ipcRenderer.invoke('store-uploaded-data', result);

        statusMessage.textContent = 'File uploaded successfully! Redirecting...';
        statusMessage.className = 'status-message success';
        
        // Tell main process to switch to main window
        setTimeout(() => {
            ipcRenderer.send('show-main-window');
        }, 1500);
        
    } catch (error) {
        statusMessage.textContent = 'Error uploading file';
        statusMessage.className = 'status-message error';
        console.error('Error:', error);
    }
} 