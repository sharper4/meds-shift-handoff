$Port = 8080
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://localhost:$Port/")
$Listener.Start()

Write-Host "Server running at http://localhost:$Port/"
Write-Host "Serving: $ProjectPath"
Write-Host "Press Ctrl+C to stop"

while ($true) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response
    $Path = $Request.Url.LocalPath
    
    if ($Path -eq "/") { $Path = "/index.html" }
    
    $FullPath = Join-Path $ProjectPath $Path.TrimStart("/")
    $FullPath = $FullPath -replace '/', '\'
    
    if (Test-Path $FullPath) {
        $Bytes = [System.IO.File]::ReadAllBytes($FullPath)
        $Response.ContentLength64 = $Bytes.Length
        $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        $Response.StatusCode = 200
        Write-Host "[200] $Path"
    } else {
        $Response.StatusCode = 404
        $Response.Close()
        Write-Host "[404] $Path"
        continue
    }
    
    $Response.Close()
}
