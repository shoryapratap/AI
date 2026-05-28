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
$programsPaths = @("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs", "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs")
$shortcuts = Get-ChildItem -Path $programsPaths -Filter *.lnk -Recurse -ErrorAction SilentlyContinue
$apps = @()
foreach ($s in $shortcuts) {
    try {
        $lnk = $shell.CreateShortcut($s.FullName)
        if ($lnk.TargetPath -and (Test-Path $lnk.TargetPath) -and $lnk.TargetPath.EndsWith('.exe', 'OrdinalIgnoreCase')) {
            $apps += @{
                Name = $s.BaseName
                Path = $lnk.TargetPath
            }
        }
    } catch {}
}
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
                
                for (const appItem of rawApps) {
                    if (!appItem || !appItem.Name || !appItem.Path) continue;
                    
                    const lowerPath = appItem.Path.toLowerCase();
                    if (uniquePaths.has(lowerPath)) continue;
                    uniquePaths.add(lowerPath);
                    
                    let iconBase64 = null;
                    try {
                        const nativeIcon = await app.getFileIcon(appItem.Path, { size: 'normal' });
                        if (nativeIcon && !nativeIcon.isEmpty()) {
                            iconBase64 = nativeIcon.toDataURL();
                        }
                    } catch (iconErr) {}
                    
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
