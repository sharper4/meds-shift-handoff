param(
  [int]$Port = 5050
)

Add-Type -AssemblyName System.Web

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Outlook draft service running on http://localhost:$Port" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray

function Write-JsonResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory = $true)]
    [int]$StatusCode,
    [Parameter(Mandatory = $true)]
    [hashtable]$Payload
  )

  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.Headers.Add("Access-Control-Allow-Origin", "*")
  $Response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS")
  $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

  $json = ($Payload | ConvertTo-Json -Depth 10)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.AbsolutePath

    if ($request.HttpMethod -eq "OPTIONS") {
      Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ ok = $true }
      continue
    }

    if ($request.HttpMethod -eq "POST" -and $path -eq "/create-draft") {
      $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
      $body = $reader.ReadToEnd()
      $reader.Close()

      $payload = $body | ConvertFrom-Json
      $to = [string]$payload.to
      $subject = [string]$payload.subject
      $htmlBody = [string]$payload.htmlBody

      if ([string]::IsNullOrWhiteSpace($to)) {
        Write-JsonResponse -Response $response -StatusCode 400 -Payload @{ ok = $false; error = "Missing 'to'" }
        continue
      }

      try {
        $outlook = New-Object -ComObject Outlook.Application
        $mailItem = $outlook.CreateItem(0)
        $mailItem.To = $to
        $mailItem.Subject = $subject
        $mailItem.HTMLBody = $htmlBody
        $mailItem.Display()

        Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ ok = $true }
      } catch {
        Write-JsonResponse -Response $response -StatusCode 500 -Payload @{ ok = $false; error = $_.Exception.Message }
      }

      continue
    }

    Write-JsonResponse -Response $response -StatusCode 404 -Payload @{ ok = $false; error = "Not found" }
  } catch {
    if ($null -ne $response -and $response.OutputStream.CanWrite) {
      Write-JsonResponse -Response $response -StatusCode 500 -Payload @{ ok = $false; error = $_.Exception.Message }
    }
  }
}
