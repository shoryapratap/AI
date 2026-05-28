$shortcuts = Get-ChildItem -Path "$env:ProgramData\Microsoft\Windows\Start Menu\Programs" -Filter *.lnk -Recurse
Write-Output $shortcuts.Count
