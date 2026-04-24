# Simple PowerShell HTTP Server for MEDS_Shift_Handoff
# Run: powershell -ExecutionPolicy Bypass -File server.ps1

param(
    [int]$Port = 8080
)

$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$MimeTypes = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "text/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://localhost:$Port/")
$Listener.Start()
Write-Host "✓ Server running at http://localhost:$Port/" -ForegroundColor Green
Write-Host "  Serving files from: $ProjectPath" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response
        $Path = $Request.Url.LocalPath

        if ($Path -eq "/") {
            $Path = "/index.html"
        }

        $FullPath = Join-Path $ProjectPath $Path.TrimStart("/")
        
        if (Test-Path $FullPath -PathType Leaf) {
            $Extension = [System.IO.Path]::GetExtension($FullPath)
            $MimeType = $MimeTypes[$Extension]
            if (-not $MimeType) {
                $MimeType = "application/octet-stream"
            }

            $Response.ContentType = $MimeType
            $Response.StatusCode = 200
            $FileContent = [System.IO.File]::ReadAllBytes($FullPath)
            $Response.ContentLength64 = $FileContent.Length
            $Response.OutputStream.Write($FileContent, 0, $FileContent.Length)
            
            Write-Host "[200] $Path" -ForegroundColor Green
        } else {
            $Response.StatusCode = 404
            $Response.ContentType = "text/plain"
            $Response.ContentLength64 = 9
            $Response.OutputStream.Write([System.Text.Encoding]::UTF8.GetBytes("Not Found"), 0, 9)
            
            Write-Host "[404] $Path" -ForegroundColor Yellow
        }

        $Response.Close()
    } catch {
        Write-Host ("Error: {0}" -f $_) -ForegroundColor Red
    }
}

$Listener.Close()
