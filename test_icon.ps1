$pkg = Get-AppxPackage -Name *WhatsApp*
if ($pkg) {
    Write-Output "Location: $($pkg.InstallLocation)"
    $manifestPath = Join-Path $pkg.InstallLocation "AppxManifest.xml"
    if (Test-Path $manifestPath) {
        $xml = [xml](Get-Content $manifestPath)
        $logo = $xml.Package.Properties.Logo
        Write-Output "Logo path in manifest: $logo"
        
        $logoName = [System.IO.Path]::GetFileNameWithoutExtension($logo)
        $logoExt = [System.IO.Path]::GetExtension($logo)
        $logoDir = [System.IO.Path]::GetDirectoryName($logo)
        
        $searchDir = Join-Path $pkg.InstallLocation $logoDir
        if (Test-Path $searchDir) {
            $files = Get-ChildItem -Path $searchDir -Filter "$logoName*$logoExt"
            if ($files.Count -gt 0) {
                Write-Output "Found actual logo file: $($files[0].FullName)"
            } else {
                Write-Output "No scaled logo found."
            }
        }
    }
} else {
    Write-Output "Package not found."
}
