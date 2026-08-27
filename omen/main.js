const { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu } = require('electron');
const path = require('path');

// Fix for Windows DWM / Explorer.exe black screen crashes when minimizing WebGL
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Set the userData path to AppData/Local/Omen
app.setPath('userData', path.join(app.getPath('appData'), '../Local/Omen'));

const { scanApps, launchAppByPath } = require('./src/services/appScanner');
const { handleAIOutput, cleanAIOutput } = require('./src/services/taskManager');
const { initReminderEngine } = require('./src/services/memoryManager');
const screenshot = require('screenshot-desktop');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const { Notification } = require('electron');

import('electron-context-menu').then(contextMenu => {
    contextMenu.default({ showInspectElement: true });
});

// Suppress SSL handshake errors caused by strict certificate checking on external CDN requests
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');

// Cache disabling switches removed to fix lag and slow startup

// Suppress Chromium console noise (like SSL handshake errors)
app.commandLine.appendSwitch('log-level', '3');

// Suppress CSP security warning spam in console
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow;
let tray = null;
let isQuitting = false;

function hideAppWindow() {
    if (mainWindow) {
        // Fix for ghost shadow on Windows
        if (process.platform === 'win32') mainWindow.setOpacity(0);
        mainWindow.setSkipTaskbar(true);
        mainWindow.hide();
    }
}

function showAppWindow() {
    if (mainWindow) {
        mainWindow.show();
        if (process.platform === 'win32') mainWindow.setOpacity(1);
        mainWindow.setSkipTaskbar(false);
    }
}

function createWindow() {
    const iconPath = app.isPackaged ? path.join(__dirname, 'dist', 'omenicon.ico') : path.join(__dirname, 'public', 'omenicon.ico');
    const icon = nativeImage.createFromPath(iconPath);

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
            webSecurity: false,
            backgroundThrottling: false
        }
    });

    // Load the frontend (React build or Vite dev server)
    const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
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
    // const { Menu } = require('electron'); // Already required at top
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    // Open DevTools in dev mode
    // mainWindow.webContents.openDevTools();

    // Log renderer console messages to terminal
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            hideAppWindow();
            return false;
        }
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
    hideAppWindow();
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
    const groupsPath = path.join(app.getPath('userData'), 'memory', 'app_groups.json');
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

ipcMain.handle('get-app-groups', () => {
    const userGroupsPath = path.join(app.getPath('userData'), 'memory', 'app_groups.json');
    const defaultGroupsPath = path.join(__dirname, 'src', 'config', 'app_groups.json');

    try {
        if (fs.existsSync(userGroupsPath)) {
            return JSON.parse(fs.readFileSync(userGroupsPath, 'utf8'));
        } else if (fs.existsSync(defaultGroupsPath)) {
            return JSON.parse(fs.readFileSync(defaultGroupsPath, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading app groups:', e);
    }
    return [];
});

ipcMain.handle('get-memory', () => {
    const userMemPath = path.join(app.getPath('userData'), 'memory', 'permanent_details.json');
    const defaultMemPath = path.join(__dirname, 'src', 'config', 'permanent_details.json');
    try {
        if (fs.existsSync(userMemPath)) {
            return JSON.parse(fs.readFileSync(userMemPath, 'utf8'));
        } else if (fs.existsSync(defaultMemPath)) {
            return JSON.parse(fs.readFileSync(defaultMemPath, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading memory:', e);
    }
    return null;
});

ipcMain.handle('save-memory', (event, data) => {
    const memPath = path.join(app.getPath('userData'), 'memory', 'permanent_details.json');
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
        const promptPath = path.join(__dirname, 'src', 'config', 'systemPrompt.txt');
        let promptText = '';
        if (fs.existsSync(promptPath)) {
            promptText = fs.readFileSync(promptPath, 'utf8');
        }

        // Dynamically append available groups so AI knows what groups exist
        const userGroupsPath = path.join(app.getPath('userData'), 'memory', 'app_groups.json');
        const defaultGroupsPath = path.join(__dirname, 'src', 'config', 'app_groups.json');

        let groupsPath = fs.existsSync(userGroupsPath) ? userGroupsPath : defaultGroupsPath;
        if (fs.existsSync(groupsPath)) {
            try {
                const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
                if (groups && groups.length > 0) {
                    const groupNames = groups.map(g => g.name).join(', ');
                    promptText += `\n\n[SYSTEM INFO]\nThe user currently has the following App Groups saved: ${groupNames}.\nIf the user asks to open any of these, use <COMMAND: LAUNCH_GROUP>GroupName</COMMAND>. If the user asks to add apps to them, use <COMMAND: ADD_APP_TO_GROUP>GroupName|App1,App2</COMMAND>. If the user asks to remove apps or delete a group, use <COMMAND: REMOVE_APP_FROM_GROUP> or <COMMAND: REMOVE_GROUP>.`;
                }
            } catch (err) { }
        }

        // Dynamically append available apps so AI knows what apps exist
        const userAppsPath = path.join(app.getPath('userData'), 'memory', 'scanned_apps_cache.json');
        if (fs.existsSync(userAppsPath)) {
            try {
                const apps = JSON.parse(fs.readFileSync(userAppsPath, 'utf8'));
                if (apps && apps.length > 0) {
                    const appNames = apps.map(a => a.name).join(', ');
                    promptText += `\n\n[SYSTEM INFO]\nThe following apps are installed and available to launch: ${appNames}.\nTo launch any of these apps, use <COMMAND: LAUNCH_APP>AppName</COMMAND>. To close them, use <COMMAND: CLOSE_APP>AppName</COMMAND>.`;
                }
            } catch (err) { }
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
    const executed = await handleAIOutput(aiResponse);

    if (executed && /(CREATE_GROUP|ADD_APP_TO_GROUP|REMOVE_APP_FROM_GROUP|REMOVE_GROUP)/.test(aiResponse)) {
        if (mainWindow) {
            mainWindow.webContents.send('app-groups-updated');
        }
    }

    return executed;
});

ipcMain.handle('clean-ai-text', (event, aiResponse) => {
    return cleanAIOutput(aiResponse);
});

ipcMain.handle('take-screenshot', async () => {
    try {
        const imgBuffer = await screenshot({ format: 'jpg' });
        return imgBuffer.toString('base64');
    } catch (e) {
        console.error('Screenshot failed:', e);
        return null;
    }
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    const trayIconPath = app.isPackaged ? path.join(__dirname, 'dist', 'omenicon.ico') : path.join(__dirname, 'public', 'omenicon.ico');
    const trayIcon = nativeImage.createFromPath(trayIconPath);
    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Omen AI', click: () => {
                if (mainWindow) showAppWindow();
                else createWindow();
            }
        },
        {
            label: 'Quit', click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Omen AI');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? hideAppWindow() : showAppWindow();
        } else {
            createWindow();
        }
    });
    
    // Initialize Reminder Engine
    initReminderEngine((reminder) => {
        console.log('[main.js] Reminder triggered:', reminder.description);
        
        // 1. Show Windows Native Notification
        if (Notification.isSupported()) {
            new Notification({
                title: 'Omen Reminder',
                body: reminder.description,
                icon: trayIconPath
            }).show();
        }
        
        // 2. Send IPC message to frontend to trigger Voice AI
        if (mainWindow) {
            mainWindow.webContents.send('trigger-reminder', reminder.description);
        }
    });
});

app.on('window-all-closed', () => {
    // Stay in tray when windows are closed
    if (isQuitting) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
