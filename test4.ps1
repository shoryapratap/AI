$shell = New-Object -ComObject WScript.Shell
$programsPaths = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs")
$shortcuts = Get-ChildItem -Path $programsPaths -Filter *.lnk -Recurse -ErrorAction SilentlyContinue
$apps = @()
foreach ($s in $shortcuts) {
    try {
        $lnk = $shell.CreateShortcut($s.FullName)
        if ($lnk.TargetPath) {
            $path = [string]$lnk.TargetPath
            $testPath = Test-Path -LiteralPath $path
            $isExe = $path -match "\.exe$"
            if ($s.BaseName -match "Chrome" -or $s.BaseName -match "Excel") {
                $apps += @{
                    Name = $s.BaseName
                    Path = $path
                    TestPath = $testPath
                    IsExe = $isExe
                }
            }
        }
    } catch {
        Write-Output "Error: $_"
    }
}
$apps | ConvertTo-Json
