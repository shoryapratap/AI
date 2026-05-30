$apps = Get-StartApps
foreach ($a in $apps) {
    if ($a.Name -match "Explorer") {
        Write-Output "Name: $($a.Name), AppID: $($a.AppID)"
    }
}
