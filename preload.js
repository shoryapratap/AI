const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize:  () => ipcRenderer.send('win-minimize'),
    maximize:  () => ipcRenderer.send('win-maximize'),
    close:     () => ipcRenderer.send('win-close'),

    // Listen for state changes from main (maximized / normal)
    onWindowStateChange: (callback) => {
        ipcRenderer.on('win-state-change', (_event, state) => callback(state));
    },

    // App Scanner
    scanApps: () => ipcRenderer.invoke('scan-apps'),
    launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath)
});
