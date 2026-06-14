const { exec, spawn } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

async function scanApps(forceFullScan = false) {
    const cachePath = path.join(__dirname, '..', 'memory', 'scanned_apps_cache.json');
    let cachedApps = [];
    if (!forceFullScan) {
        try {
            if (fs.existsSync(cachePath)) {
                cachedApps = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            }
        } catch (e) {
            console.error('Error reading app cache:', e);
        }
    }
    const cacheMap = new Map();
    for (const ca of cachedApps) {
        if (ca.path && ca.iconBase64) {
            cacheMap.set(ca.path.toLowerCase(), ca.iconBase64);
        }
    }

    return new Promise((resolve, reject) => {
        const scriptId = crypto.randomBytes(4).toString('hex');
        const scriptPath = path.join(os.tmpdir(), `scan_${scriptId}.ps1`);
        
        const psScript = `
$shell = New-Object -ComObject WScript.Shell
$programsPaths = @("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs", "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs", "$env:PUBLIC\\Desktop", "$env:USERPROFILE\\Desktop")
$shortcuts = Get-ChildItem -Path $programsPaths -Filter *.lnk -Recurse -ErrorAction SilentlyContinue
$apps = @()

# 1. Traditional Shortcuts
foreach ($s in $shortcuts) {
    try {
        $lnk = $shell.CreateShortcut($s.FullName)
        if ($lnk.TargetPath -and (Test-Path $lnk.TargetPath) -and $lnk.TargetPath.EndsWith('.exe', 'OrdinalIgnoreCase')) {
            $apps += @{
                Name = $s.BaseName
                Path = $lnk.TargetPath
                Dir = $lnk.WorkingDirectory
            }
        }
    } catch {}
}

# 2. UWP Apps (Windows Store)
try {
    $allPackages = Get-AppxPackage -ErrorAction SilentlyContinue
    $pkgLookup = @{}
    foreach ($p in $allPackages) {
        if ($p.PackageFamilyName) {
            $pkgLookup[$p.PackageFamilyName] = $p
        }
    }

    $startApps = Get-StartApps
    foreach ($app in $startApps) {
        # AppID for UWP usually does not contain a backslash or drive letter
        if (-not ($app.AppID -match '^[a-zA-Z]:\\\\') -and -not ($app.AppID -match '^(http|microsoft-edge)')) {
            $iconB64 = ""
            $packageFamilyName = $app.AppID.Split('!')[0]
            try {
                $pkg = $pkgLookup[$packageFamilyName]
                if ($pkg) {
                    $manifestPath = Join-Path $pkg.InstallLocation "AppxManifest.xml"
                    if (Test-Path $manifestPath) {
                        $xml = [xml](Get-Content $manifestPath -ErrorAction SilentlyContinue)
                        $logo = $xml.Package.Properties.Logo
                        if ($logo) {
                            $logoName = [System.IO.Path]::GetFileNameWithoutExtension($logo)
                            $logoExt = [System.IO.Path]::GetExtension($logo)
                            $logoDir = [System.IO.Path]::GetDirectoryName($logo)
                            $searchDir = Join-Path $pkg.InstallLocation $logoDir
                            if (Test-Path $searchDir) {
                                $files = Get-ChildItem -Path $searchDir -Filter "$logoName*$logoExt" -ErrorAction SilentlyContinue
                                if ($files.Count -gt 0) {
                                    $bytes = [System.IO.File]::ReadAllBytes($files[0].FullName)
                                    $iconB64 = "data:image/png;base64," + [Convert]::ToBase64String($bytes)
                                }
                            }
                        }
                    }
                }
            } catch {}
            
            $apps += @{
                Name = $app.Name
                Path = $app.AppID
                Dir = ""
                IconBase64 = $iconB64
            }
        }
    }
} catch {}

$apps | ConvertTo-Json -Compress
`;
        
        fs.writeFileSync(scriptPath, psScript, 'utf8');
        
        exec(`powershell.exe -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 50 }, async (error, stdout, stderr) => {
            try { fs.unlinkSync(scriptPath); } catch(e) {}
            
            if (error) {
                console.error('Error scanning apps:', error);
                return reject(error);
            }
            
            try {
                if (!stdout.trim()) {
                    return resolve([]);
                }
                
                let rawApps = JSON.parse(stdout);
                if (!Array.isArray(rawApps)) {
                    rawApps = [rawApps];
                }
                
                let idCounter = 1;
                const formattedApps = [];
                const uniquePaths = new Set();
                const uniqueNames = new Set();
                
                require('fs').writeFileSync('c:/Coding/Projects/AI/test_explorer_debug.json', JSON.stringify(rawApps.filter(a => a && a.Name && a.Name.toLowerCase().includes('explorer')), null, 2));

                for (const appItem of rawApps) {
                    if (!appItem || !appItem.Name || !appItem.Path) continue;
                    
                    let lowerPath = appItem.Path.toLowerCase();
                    const lowerName = appItem.Name.toLowerCase();

                    if (appItem.Path === 'Microsoft.Windows.Explorer') {
                        appItem.Path = 'C:\\Windows\\explorer.exe';
                        // Prevent it from being blocked if another shortcut points to explorer.exe
                        lowerPath = 'microsoft.windows.explorer';
                    }

                    // Prevent duplicates (e.g. Brave from shortcuts AND StartApps)
                    if (uniquePaths.has(lowerPath) || uniqueNames.has(lowerName)) continue;
                    
                    uniquePaths.add(lowerPath);
                    uniqueNames.add(lowerName);
                    
                    let iconBase64 = appItem.IconBase64 || null;
                    if (!iconBase64 && !forceFullScan && cacheMap.has(lowerPath)) {
                        iconBase64 = cacheMap.get(lowerPath);
                    }

                    if (!iconBase64 && (appItem.Path.includes('\\') || appItem.Path.includes('/'))) {
                        try {
                            const nativeIcon = await app.getFileIcon(appItem.Path, { size: 'normal' });
                            if (nativeIcon && !nativeIcon.isEmpty()) {
                                iconBase64 = nativeIcon.toDataURL();
                            }
                        } catch (iconErr) {}
                    }
                    
                    formattedApps.push({
                        id: idCounter++,
                        name: appItem.Name,
                        path: appItem.Path,
                        iconBase64: iconBase64,
                        group: null 
                    });
                }
                
                formattedApps.sort((a, b) => a.name.localeCompare(b.name));
                try {
                    fs.writeFileSync(cachePath, JSON.stringify(formattedApps, null, 2), 'utf8');
                } catch(e) {
                    console.error('Failed to write app cache:', e);
                }
                resolve(formattedApps);
            } catch (parseError) {
                console.error('Failed to parse apps JSON:', parseError);
                reject(parseError);
            }
        });
    });
}

async function launchAppByPath(appPath) {
    return new Promise((resolve) => {
        try {
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
}

async function launchAppByName(appName) {
    const cachePath = path.join(__dirname, '..', 'memory', 'scanned_apps_cache.json');
    try {
        if (!fs.existsSync(cachePath)) {
            console.log(`[AI Launch] App cache not found.`);
            return false;
        }
        const cachedApps = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        const searchName = appName.toLowerCase();
        
        let targetApp = cachedApps.find(a => a.name.toLowerCase() === searchName);
        if (!targetApp) {
            targetApp = cachedApps.find(a => a.name.toLowerCase().includes(searchName));
        }

        if (targetApp && targetApp.path) {
            console.log(`[AI Launch] Found app "${targetApp.name}" for query "${appName}".`);
            return await launchAppByPath(targetApp.path);
        } else {
            console.log(`[AI Launch] App "${appName}" not found in cache.`);
            return false;
        }
    } catch (e) {
        console.error('Error in launchAppByName:', e);
        return false;
    }
}

async function launchGroupByName(groupName) {
    const groupsPath = path.join(__dirname, '..', 'memory', 'app_groups.json');
    try {
        if (!fs.existsSync(groupsPath)) {
            console.log(`[AI Launch] Groups file not found.`);
            return false;
        }
        const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
        const searchName = groupName.toLowerCase();
        
        let targetGroup = groups.find(g => g.name.toLowerCase() === searchName);
        if (!targetGroup) {
            targetGroup = groups.find(g => g.name.toLowerCase().includes(searchName));
        }

        if (targetGroup && targetGroup.apps && targetGroup.apps.length > 0) {
            console.log(`[AI Launch] Found group "${targetGroup.name}" for query "${groupName}". Launching ${targetGroup.apps.length} apps.`);
            const promises = targetGroup.apps.map(app => {
                if (app.path) return launchAppByPath(app.path);
                return Promise.resolve(false);
            });
            await Promise.all(promises);
            return true;
        } else {
            console.log(`[AI Launch] Group "${groupName}" not found or is empty.`);
            return false;
        }
    } catch (e) {
        console.error('Error in launchGroupByName:', e);
        return false;
    }
}

module.exports = {
    scanApps,
    launchAppByPath,
    launchAppByName,
    launchGroupByName
};
