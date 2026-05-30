const ps = `$apps = @(); $startApps = Get-StartApps; foreach ($app in $startApps) { if (-not ($app.AppID -match '^[a-zA-Z]:\\\\') -and -not ($app.AppID -match '^(http|microsoft-edge)')) { $apps += @{ Name = $app.Name; Path = $app.AppID; Dir = '' } } }; $apps | ConvertTo-Json`;
require('fs').writeFileSync('test.ps1', ps);
console.log('wrote test.ps1');
