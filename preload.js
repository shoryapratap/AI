const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.send('win-minimize'),
    maximize: () => ipcRenderer.send('win-maximize'),
    close: () => ipcRenderer.send('win-close'),

    // Listen for state changes from main (maximized / normal)
    onWindowStateChange: (callback) => {
        ipcRenderer.on('win-state-change', (_event, state) => callback(state));
    },

    // App Scanner
    scanApps: (forceFullScan) => ipcRenderer.invoke('scan-apps', forceFullScan),
    launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
    saveAppGroups: (groups) => ipcRenderer.invoke('save-app-groups', groups),
    getAppGroups: () => ipcRenderer.invoke('get-app-groups'),
    onAppGroupsUpdated: (callback) => {
        ipcRenderer.removeAllListeners('app-groups-updated');
        ipcRenderer.on('app-groups-updated', callback);
    },

    // AI Bridge
    getSystemPrompt: () => ipcRenderer.invoke('get-system-prompt'),
    handleAITask: (aiResponse) => ipcRenderer.invoke('handle-ai-task', aiResponse),
    cleanAIText: (aiResponse) => ipcRenderer.invoke('clean-ai-text', aiResponse),

    // Memory API
    getMemory: () => ipcRenderer.invoke('get-memory'),
    saveMemory: (data) => ipcRenderer.invoke('save-memory', data)
});
