const { ipcRenderer } = require('electron');

// Get DOM elements
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const statusMessage = document.getElementById('statusMessage');
const selectDirBtn = document.getElementById('selectDirBtn');
const selectedDirPath = document.getElementById('selectedDirPath');

// Handle directory selection
selectDirBtn.addEventListener('click', async () => {
    try {
        const result = await ipcRenderer.invoke('select-directory');
        if (result.path) {
            selectedDirPath.textContent = result.path;
            uploadBtn.disabled = false; // Enable upload button once directory is selected
            
            // Save the selected directory
            await ipcRenderer.invoke('save-directory', result.path);

            // Check if there are existing assessments
            if (result.existingFiles && result.existingFiles.length > 0) {
                statusMessage.textContent = `Directory selected. Found ${result.existingFiles.length} existing assessment(s) which will be loaded.`;
                statusMessage.className = 'status-message success';
            } else {
                statusMessage.textContent = 'Directory selected. No existing assessments found.';
                statusMessage.className = 'status-message success';
            }
        }
    } catch (error) {
        console.error('Error selecting directory:', error);
        statusMessage.textContent = 'Error selecting directory';
        statusMessage.className = 'status-message error';
    }
});

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
    
    // Check if directory is selected
    if (!selectedDirPath.textContent) {
        statusMessage.textContent = 'Please select a save directory first';
        statusMessage.className = 'status-message error';
        return;
    }
    
    // Handle the dropped file
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload();
    }
});

// Handle click upload
uploadBtn.addEventListener('click', () => {
    // Check if directory is selected
    if (!selectedDirPath.textContent) {
        statusMessage.textContent = 'Please select a save directory first';
        statusMessage.className = 'status-message error';
        return;
    }
    
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