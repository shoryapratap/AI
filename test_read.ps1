$bytes = [System.IO.File]::ReadAllBytes('C:\Program Files\WindowsApps\5319275A.WhatsAppDesktop_2.2620.102.0_x64__cv1g1gvanyjgm\Assets\StoreLogo.scale-100.png')
Write-Output $bytes.Length
