$shell = New-Object -ComObject WScript.Shell
$programsPaths = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs")
$shortcuts = Get-ChildItem -Path $programsPaths -Filter *.lnk -Recurse -ErrorAction SilentlyContinue
$apps = @()
foreach ($s in $shortcuts) {
    try {
        $lnk = $shell.CreateShortcut($s.FullName)
        if ($lnk.TargetPath -and (Test-Path $lnk.TargetPath) -and ($lnk.TargetPath -match "\.exe$")) {
            $apps += @{
                Name = $s.BaseName
                Path = $lnk.TargetPath
            }
        }
    } catch {}
}
$apps | Sort-Object Name -Unique | ConvertTo-Json -Compress