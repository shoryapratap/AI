
$shell = New-Object -ComObject WScript.Shell
$programsPaths = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs", "$env:PUBLIC\Desktop", "$env:USERPROFILE\Desktop")
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
        if (-not ($app.AppID -match '^[a-zA-Z]:\\') -and -not ($app.AppID -match '^(http|microsoft-edge)')) {
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
