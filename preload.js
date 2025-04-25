contextBridge.exposeInMainWorld('electronAPI', {
    exportAppQuestions: (data) => ipcRenderer.invoke('export-app-questions', data),
}); 