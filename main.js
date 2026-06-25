const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { scanApps, launchAppByPath } = require('./control/appScanner');
const { handleAIOutput, cleanAIOutput } = require('./core/taskManager');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// Suppress SSL handshake errors caused by strict certificate checking on external CDN requests
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');

// Cache disabling switches removed to fix lag and slow startup

// Suppress Chromium console noise (like SSL handshake errors)
app.commandLine.appendSwitch('log-level', '3');

// Suppress CSP security warning spam in console
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow;

function createWindow() {
    const icon = nativeImage.createFromPath(
        path.join(__dirname, 'frontend-react', 'dist', 'assets', 'icon.ico')
    );

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 760,
        minWidth: 860,
        minHeight: 560,
        frame: false,           // Custom frameless window
        transparent: false,
        backgroundColor: '#030307',
        icon: icon,
        titleBarStyle: 'hidden',
        show: true,            // Show instantly to fix delayed startup perception
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        }
    });

    // Load the frontend (React build or Vite dev server)
    const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'frontend-react', 'dist', 'index.html'));
    }

    // Create basic application menu to enable standard copy/paste shortcuts
    const template = [{
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' }
        ]
    }];
    const { Menu } = require('electron');
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    // Open DevTools in dev mode
    // mainWindow.webContents.openDevTools();

    // Log renderer console messages to terminal
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Relay maximize/restore state back to renderer
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('win-state-change', 'maximized');
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('win-state-change', 'normal');
    });
}

// IPC Window Controls
ipcMain.on('win-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('win-maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
});

ipcMain.on('win-close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('scan-apps', async (event, forceFullScan) => {
    try {
        return await scanApps(forceFullScan);
    } catch (err) {
        console.error('Error scanning apps via IPC:', err);
        return [];
    }
});

ipcMain.handle('launch-app', async (event, appPath) => {
    return await launchAppByPath(appPath);
});

ipcMain.handle('save-app-groups', (event, groups) => {
    const groupsPath = path.join(__dirname, 'memory', 'app_groups.json');
    try {
        if (!fs.existsSync(path.dirname(groupsPath))) {
            fs.mkdirSync(path.dirname(groupsPath), { recursive: true });
        }
        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving app groups:', e);
        return false;
    }
});

ipcMain.handle('get-memory', () => {
    const memPath = path.join(__dirname, 'memory', 'permanent_details.json');
    try {
        if (fs.existsSync(memPath)) {
            return JSON.parse(fs.readFileSync(memPath, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading memory:', e);
    }
    return null;
});

ipcMain.handle('save-memory', (event, data) => {
    const memPath = path.join(__dirname, 'memory', 'permanent_details.json');
    try {
        if (!fs.existsSync(path.dirname(memPath))) {
            fs.mkdirSync(path.dirname(memPath), { recursive: true });
        }
        fs.writeFileSync(memPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving memory:', e);
        return false;
    }
});

ipcMain.handle('get-system-prompt', () => {
    try {
        const promptPath = path.join(__dirname, 'core', 'systemPrompt.txt');
        let promptText = '';
        if (fs.existsSync(promptPath)) {
            promptText = fs.readFileSync(promptPath, 'utf8');
        }

        // Dynamically append available groups so AI knows what groups exist
        const groupsPath = path.join(__dirname, 'memory', 'app_groups.json');
        if (fs.existsSync(groupsPath)) {
            try {
                const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
                if (groups && groups.length > 0) {
                    const groupNames = groups.map(g => g.name).join(', ');
                    promptText += `\n\n[SYSTEM INFO]\nThe user currently has the following App Groups saved: ${groupNames}.\nIf the user asks to open any of these, use <COMMAND: LAUNCH_GROUP>GroupName</COMMAND> in your speech.`;
                }
            } catch (err) {}
        }

        return promptText;
    } catch (e) {
        console.error('Error reading system prompt:', e);
    }
    return '';
});

ipcMain.handle('handle-ai-task', async (event, aiResponse) => {
    console.log('[main.js] Received AI response for task manager:');
    console.log(aiResponse);
    return await handleAIOutput(aiResponse);
});

ipcMain.handle('clean-ai-text', (event, aiResponse) => {
    return cleanAIOutput(aiResponse);
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
