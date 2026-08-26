const { exec, spawn } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const memoryDir = path.join(app.getPath('userData'), 'memory');

async function getCachedApps() {
    const cachePath = path.join(memoryDir, 'scanned_apps_cache.json');
    if (!fs.existsSync(cachePath)) {
        console.log(`[App Scanner] Cache not found, running background scan...`);
        await scanApps();
    }
    if (fs.existsSync(cachePath)) {
        try {
            return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        } catch(e) {
            console.error('Error parsing app cache:', e);
        }
    }
    return [];
}
if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
}

async function scanApps(forceFullScan = false) {
    const cachePath = path.join(memoryDir, 'scanned_apps_cache.json');
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
        const scriptPath = path.join(memoryDir, `app_scanner.ps1`);
        
        // Delete previous script first as requested
        if (fs.existsSync(scriptPath)) {
            try { fs.unlinkSync(scriptPath); } catch (e) {}
        }
        
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
            
            if (error) {
                console.error('Error scanning apps:', error);
                return reject(error);
            }
            
            try {
                if (!stdout.trim()) {
                    return resolve([]);
                }
                
                // Robust JSON extraction to ignore PS warnings/errors leaking to stdout
                let cleanStdout = stdout;
                const jsonStart = cleanStdout.indexOf('[');
                const jsonEnd = cleanStdout.lastIndexOf(']') + 1;
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    cleanStdout = cleanStdout.substring(jsonStart, jsonEnd);
                }
                
                let rawApps = JSON.parse(cleanStdout);
                if (!Array.isArray(rawApps)) {
                    rawApps = [rawApps];
                }
                
                let idCounter = 1;
                const formattedApps = [];
                const uniquePaths = new Set();
                const uniqueNames = new Set();
                
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
    try {
        const cachedApps = await getCachedApps();
        if (!cachedApps || cachedApps.length === 0) {
            console.log(`[AI Launch] App cache is empty or could not be generated.`);
            return false;
        }
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
    const groupsPath = path.join(memoryDir, 'app_groups.json');
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

async function closeAppByPath(appPath, appName) {
    return new Promise((resolve) => {
        try {
            if (appPath.includes('\\') || appPath.includes('/')) {
                const exeName = path.basename(appPath);
                console.log(`[Close] Stopping ${exeName}...`);
                exec(`taskkill /IM "${exeName}" /F`, (err) => {
                    if (err && appName) {
                        exec(`powershell.exe -Command "Get-Process | Where-Object {$_.MainWindowTitle -match '${appName}'} | Stop-Process -Force"`, () => resolve(true));
                    } else {
                        resolve(true);
                    }
                });
            } else {
                console.log(`[Close] Stopping UWP app ${appName}...`);
                exec(`powershell.exe -Command "Get-Process | Where-Object {$_.MainWindowTitle -match '${appName}'} | Stop-Process -Force"`, () => resolve(true));
            }
        } catch (err) {
            console.error('Error closing app:', err);
            resolve(false);
        }
    });
}

async function closeAppByName(appName) {
    try {
        const cachedApps = await getCachedApps();
        if (!cachedApps || cachedApps.length === 0) {
            console.log(`[AI Close] App cache is empty.`);
            return false;
        }
        const searchName = appName.toLowerCase();
        
        let targetApp = cachedApps.find(a => a.name.toLowerCase() === searchName);
        if (!targetApp) {
            targetApp = cachedApps.find(a => a.name.toLowerCase().includes(searchName));
        }

        if (targetApp && targetApp.path) {
            console.log(`[AI Close] Found app "${targetApp.name}" for query "${appName}".`);
            return await closeAppByPath(targetApp.path, targetApp.name);
        } else {
            console.log(`[AI Close] App "${appName}" not found in cache.`);
            return false;
        }
    } catch (e) {
        console.error('Error in closeAppByName:', e);
        return false;
    }
}

async function closeGroupByName(groupName) {
    const groupsPath = path.join(memoryDir, 'app_groups.json');
    try {
        if (!fs.existsSync(groupsPath)) {
            return false;
        }
        const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
        const searchName = groupName.toLowerCase();
        
        let targetGroup = groups.find(g => g.name.toLowerCase() === searchName);
        if (!targetGroup) {
            targetGroup = groups.find(g => g.name.toLowerCase().includes(searchName));
        }

        if (targetGroup && targetGroup.apps && targetGroup.apps.length > 0) {
            const promises = targetGroup.apps.map(app => {
                if (app.path) return closeAppByPath(app.path, app.name);
                return Promise.resolve(false);
            });
            await Promise.all(promises);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

async function _resolveApps(appNamesArray, cachedApps) {
    const resolvedApps = [];
    for (const appName of appNamesArray) {
        const searchName = appName.trim().toLowerCase();
        if (!searchName) continue;

        let targetApp = cachedApps.find(a => a.name.toLowerCase() === searchName);
        if (!targetApp) {
            targetApp = cachedApps.find(a => a.name.toLowerCase().includes(searchName));
        }
        if (targetApp && targetApp.path) {
            resolvedApps.push(targetApp);
        } else {
            console.log(`[AI Launch] Warning: Could not find app matching "${appName}" to add to group.`);
        }
    }
    return resolvedApps;
}

async function createGroupByName(groupName, appNamesArray) {
    const groupsPath = path.join(memoryDir, 'app_groups.json');
    
    try {
        const cachedApps = await getCachedApps();
        if (!cachedApps || cachedApps.length === 0) {
            console.log(`[AI Launch] App cache not found. Cannot create group.`);
            return false;
        }
        let groups = fs.existsSync(groupsPath) ? JSON.parse(fs.readFileSync(groupsPath, 'utf8')) : [];

        const resolvedApps = await _resolveApps(appNamesArray, cachedApps);

        // Overwrite if exists
        groups = groups.filter(g => g.name.toLowerCase() !== groupName.toLowerCase());
        groups.push({ id: Date.now(), name: groupName, apps: resolvedApps });

        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 4), 'utf8');
        console.log(`[AI Launch] Successfully created group "${groupName}" with ${resolvedApps.length} apps.`);
        return true;
    } catch (e) {
        console.error('Error in createGroupByName:', e);
        return false;
    }
}

async function addAppsToGroup(groupName, appNamesArray) {
    const groupsPath = path.join(memoryDir, 'app_groups.json');
    
    try {
        const cachedApps = await getCachedApps();
        if (!cachedApps || cachedApps.length === 0) {
            console.log(`[AI Launch] App cache not found. Cannot add apps to group.`);
            return false;
        }
        let groups = fs.existsSync(groupsPath) ? JSON.parse(fs.readFileSync(groupsPath, 'utf8')) : [];

        let targetGroup = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
        if (!targetGroup) {
            // Group doesn't exist, create it
            console.log(`[AI Launch] Group "${groupName}" not found. Creating it instead.`);
            targetGroup = { id: Date.now(), name: groupName, apps: [] };
            groups.push(targetGroup);
        }

        const resolvedApps = await _resolveApps(appNamesArray, cachedApps);
        
        // Append new apps without duplicating existing ones
        for (const app of resolvedApps) {
            if (!targetGroup.apps.find(a => a.path.toLowerCase() === app.path.toLowerCase())) {
                targetGroup.apps.push(app);
            }
        }

        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 4), 'utf8');
        console.log(`[AI Launch] Successfully added apps to group "${targetGroup.name}". Now contains ${targetGroup.apps.length} apps.`);
        return true;
    } catch (e) {
        console.error('Error in addAppsToGroup:', e);
        return false;
    }
}

async function removeAppsFromGroup(groupName, appNamesArray) {
    const groupsPath = path.join(memoryDir, 'app_groups.json');
    
    try {
        if (!fs.existsSync(groupsPath)) {
            console.log(`[AI Launch] Groups file not found. Cannot remove apps.`);
            return false;
        }
        let groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));

        let targetGroup = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
        if (!targetGroup) {
            console.log(`[AI Launch] Group "${groupName}" not found.`);
            return false;
        }

        const originalCount = targetGroup.apps.length;

        for (const appName of appNamesArray) {
            const searchName = appName.trim().toLowerCase();
            if (!searchName) continue;

            targetGroup.apps = targetGroup.apps.filter(a => 
                a.name.toLowerCase() !== searchName && 
                !a.name.toLowerCase().includes(searchName)
            );
        }

        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 4), 'utf8');
        console.log(`[AI Launch] Removed ${originalCount - targetGroup.apps.length} apps from group "${targetGroup.name}".`);
        return true;
    } catch (e) {
        console.error('Error in removeAppsFromGroup:', e);
        return false;
    }
}

async function removeGroupByName(groupName) {
    const groupsPath = path.join(memoryDir, 'app_groups.json');
    
    try {
        if (!fs.existsSync(groupsPath)) {
            console.log(`[AI Launch] Groups file not found. Cannot remove group.`);
            return false;
        }
        let groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
        const searchName = groupName.trim().toLowerCase();

        const initialLength = groups.length;
        groups = groups.filter(g => g.name.toLowerCase() !== searchName);

        if (groups.length === initialLength) {
             console.log(`[AI Launch] Group "${groupName}" not found to remove.`);
             return false;
        }

        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 4), 'utf8');
        console.log(`[AI Launch] Successfully removed group "${groupName}".`);
        return true;
    } catch (e) {
        console.error('Error in removeGroupByName:', e);
        return false;
    }
}

async function renameGroupByName(oldGroupName, newGroupName) {
    const groupsPath = path.join(memoryDir, 'app_groups.json');
    
    try {
        if (!fs.existsSync(groupsPath)) {
            console.log(`[AI Launch] Groups file not found. Cannot rename group.`);
            return false;
        }
        let groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
        const searchName = oldGroupName.trim().toLowerCase();

        const targetGroup = groups.find(g => g.name.toLowerCase() === searchName);

        if (!targetGroup) {
             console.log(`[AI Launch] Group "${oldGroupName}" not found to rename.`);
             return false;
        }

        targetGroup.name = newGroupName.trim();

        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 4), 'utf8');
        console.log(`[AI Launch] Successfully renamed group to "${newGroupName}".`);
        return true;
    } catch (e) {
        console.error('Error in renameGroupByName:', e);
        return false;
    }
}

async function handleAppCommand(task, content) {
    let executed = false;
    switch (task) {
        case 'LAUNCH_APP':
            executed = await launchAppByName(content);
            if (executed) console.log(`[App Scanner] Successfully launched app: ${content}`);
            break;
        case 'LAUNCH_GROUP':
            executed = await launchGroupByName(content);
            if (executed) console.log(`[App Scanner] Successfully launched group: ${content}`);
            break;
        case 'CLOSE_APP':
            executed = await closeAppByName(content);
            if (executed) console.log(`[App Scanner] Successfully closed app: ${content}`);
            break;
        case 'CLOSE_GROUP':
            executed = await closeGroupByName(content);
            if (executed) console.log(`[App Scanner] Successfully closed group: ${content}`);
            break;
        case 'REMOVE_GROUP':
            console.log(`[App Scanner] Removing group: ${content}`);
            executed = await removeGroupByName(content);
            if (executed) console.log(`[App Scanner] Successfully removed group: ${content}`);
            break;
        case 'RENAME_GROUP':
            const renameParts = content.split('|');
            if (renameParts.length >= 2) {
                const oldName = renameParts[0].trim();
                const newName = renameParts[1].trim();
                console.log(`[App Scanner] Renaming group from ${oldName} to ${newName}`);
                executed = await renameGroupByName(oldName, newName);
                if (executed) console.log(`[App Scanner] Successfully renamed group to: ${newName}`);
            }
            break;
        case 'CREATE_GROUP':
        case 'ADD_APP_TO_GROUP':
        case 'REMOVE_APP_FROM_GROUP':
            const parts = content.split('|');
            if (parts.length >= 1) {
                const groupName = parts[0].trim();
                const appsArray = parts.length > 1 ? parts[1].split(',').map(s => s.trim()).filter(s => s) : [];
                
                if (task === 'CREATE_GROUP') {
                    console.log(`[App Scanner] Creating group: ${groupName}`);
                    executed = await createGroupByName(groupName, appsArray);
                    if (executed) console.log(`[App Scanner] Successfully created group: ${groupName}`);
                } else if (task === 'ADD_APP_TO_GROUP') {
                    console.log(`[App Scanner] Adding apps to group: ${groupName}`);
                    executed = await addAppsToGroup(groupName, appsArray);
                    if (executed) console.log(`[App Scanner] Successfully added apps to group: ${groupName}`);
                } else if (task === 'REMOVE_APP_FROM_GROUP') {
                    console.log(`[App Scanner] Removing apps from group: ${groupName}`);
                    executed = await removeAppsFromGroup(groupName, appsArray);
                    if (executed) console.log(`[App Scanner] Successfully removed apps from group: ${groupName}`);
                }
            }
            break;
    }
    return executed;
}

module.exports = {
    scanApps,
    handleAppCommand,
    launchAppByPath,
    launchAppByName,
    launchGroupByName,
    closeAppByPath,
    closeAppByName,
    closeGroupByName,
    createGroupByName,
    addAppsToGroup,
    removeAppsFromGroup,
    removeGroupByName,
    renameGroupByName
};
