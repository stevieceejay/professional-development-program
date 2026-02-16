param(
    [string]$BaseUrl = "http://localhost:8080",
    [pscredential]$Credential,
    [int]$UserId = 0
)

if (-not $Credential) {
    Write-Host "Usage: .\smoke-auth.ps1 -Credential (Get-Credential) [-UserId 1] [-BaseUrl http://localhost:8080]" -ForegroundColor Yellow
    exit 2
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Sign in
try {
    $Username = $Credential.UserName
    $PasswordPlain = $Credential.GetNetworkCredential().Password
    $bodyObj = @{ username = $Username; password = $PasswordPlain }
    $bodyJson = $bodyObj | ConvertTo-Json
    $signin = Invoke-WebRequest -Uri "$BaseUrl/api/signin" -Method Post -Body $bodyJson -ContentType "application/json" -WebSession $session -UseBasicParsing -ErrorAction Stop
    if ($signin.StatusCode -ne 200) {
        Write-Host "[FAIL] Signin: expected 200, got $($signin.StatusCode)" -ForegroundColor Red
        exit 1
    }
    Write-Host "[PASS] Signin (200)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Signin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# If no UserId provided, auto-discover one via admin search
if ($UserId -le 0) {
    try {
        $search = Invoke-WebRequest -Uri "$BaseUrl/api/admin/user_search?q=" -Method Get -WebSession $session -UseBasicParsing -ErrorAction Stop
        $json = $search.Content | ConvertFrom-Json
        if ($json.status -eq 'success' -and $json.data.users.Count -gt 0) {
            $UserId = [int]$json.data.users[0].id
            Write-Host "[INFO] Auto-selected UserId: $UserId" -ForegroundColor Cyan
        } else {
            Write-Host "[FAIL] Could not resolve a user id from admin search" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[FAIL] Admin search failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Admin user details should return 200 when authenticated
try {
    $details = Invoke-WebRequest -Uri "$BaseUrl/api/admin/users/$UserId/details" -Method Get -WebSession $session -UseBasicParsing -ErrorAction Stop
    if ($details.StatusCode -ne 200) {
        Write-Host "[FAIL] Admin User Details: expected 200, got $($details.StatusCode)" -ForegroundColor Red
        exit 1
    }
    Write-Host "[PASS] Admin User Details ($($details.StatusCode))" -ForegroundColor Green
    exit 0
} catch {
    if ($null -ne $_.Exception.Response) {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "[FAIL] Admin User Details: expected 200, got $code" -ForegroundColor Red
    } else {
        Write-Host "[FAIL] Admin User Details: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}