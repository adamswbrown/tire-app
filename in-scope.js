const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.invoke('get-in-scope-data').then(inScopeData => {
        const tableBody = document.querySelector('#inScopeTable tbody');
        tableBody.innerHTML = ''; // Clear existing rows

        inScopeData.forEach(row => {
            const tr = document.createElement('tr');
            const fields = ['Application Name', 'Environment', 'Data Center'];

            fields.forEach(field => {
                const td = document.createElement('td');
                td.textContent = row[field] || '';
                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    });
});
