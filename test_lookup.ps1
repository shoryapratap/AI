$allPackages = Get-AppxPackage
$pkgLookup = @{}
foreach ($p in $allPackages) {
    $pkgLookup[$p.PackageFamilyName] = $p
}

$packageFamilyName = "5319275A.WhatsAppDesktop_cv1g1gvanyjgm"
$pkg = $pkgLookup[$packageFamilyName]

if ($pkg) {
    Write-Output "Found: $($pkg.InstallLocation)"
} else {
    Write-Output "Not found."
}
