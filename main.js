const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { scanApps } = require('./control/appScanner');
const { spawn, exec } = require('child_process');

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
        show: false,            // Don't flash; show after ready-to-show
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        }
    });

    // Load the frontend (React build)
    mainWindow.loadFile(path.join(__dirname, 'frontend-react', 'dist', 'index.html'));

    // Show window gracefully after paint
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in dev mode
    // mainWindow.webContents.openDevTools();

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

ipcMain.handle('scan-apps', async () => {
    try {
        return await scanApps();
    } catch (err) {
        console.error('Error scanning apps via IPC:', err);
        return [];
    }
});

ipcMain.handle('launch-app', async (event, appPath) => {
    return new Promise((resolve) => {
        try {
            // Check if it's a UWP App (no backslashes)
            if (!appPath.includes('\\') && !appPath.includes('/')) {
                console.log(`[Launch] Starting UWP app ${appPath}...`);
                const child = spawn('explorer.exe', [`shell:AppsFolder\\${appPath}`], { detached: true, stdio: 'ignore' });
                child.unref();
                resolve(true);
                return;
            }

            const exeName = path.basename(appPath);
            const appDir = path.dirname(appPath);
            
            console.log(`[Launch] Starting ${exeName}...`);
            const child = spawn(appPath, [], { detached: true, stdio: 'ignore', cwd: appDir });
            child.unref();
            resolve(true);
        } catch (err) {
            console.error('Error launching app:', err);
            resolve(false);
        }
    });
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
