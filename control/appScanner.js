const { exec } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function scanApps() {
    return new Promise((resolve, reject) => {
        const scriptId = crypto.randomBytes(4).toString('hex');
        const scriptPath = path.join(__dirname, `scan_${scriptId}.ps1`);
        
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
                resolve(formattedApps);
            } catch (parseError) {
                console.error('Failed to parse apps JSON:', parseError);
                reject(parseError);
            }
        });
    });
}

module.exports = {
    scanApps
};
