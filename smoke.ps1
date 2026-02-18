param(
    [string]$BaseUrl = "http://localhost:8080"
)

function Test-Endpoint {
    param(
        [string]$Url,
        [int]$ExpectedStatus,
        [string]$Name
    )
    try {
        $resp = Invoke-WebRequest $Url -UseBasicParsing -ErrorAction Stop
        $code = $resp.StatusCode
    } catch {
        if ($null -ne $_.Exception.Response) {
            $code = $_.Exception.Response.StatusCode.value__
        } else {
            Write-Host "[FAIL] ${Name}: Request error: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    if ($code -eq $ExpectedStatus) {
        Write-Host "[PASS] ${Name} ($code)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[FAIL] ${Name}: expected ${ExpectedStatus}, got $code" -ForegroundColor Red
        return $false
    }
}

$results = @()
$results += Test-Endpoint -Url "$BaseUrl/api/health" -ExpectedStatus 200 -Name "Health"
$results += Test-Endpoint -Url "$BaseUrl/index.html" -ExpectedStatus 200 -Name "Index HTML"
$results += Test-Endpoint -Url "$BaseUrl/admin-dashboard.html" -ExpectedStatus 200 -Name "Admin Dashboard HTML"
# Admin details should be forbidden (403) without admin session
$results += Test-Endpoint -Url "$BaseUrl/api/admin/users/1/details" -ExpectedStatus 403 -Name "Admin User Details (no session)"

$passed = ($results | Where-Object { $_ -eq $true }).Count
$total = $results.Count

if ($passed -eq $total) {
    Write-Host "All smoke tests passed ($passed/$total)." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Smoke tests failed ($passed/$total)." -ForegroundColor Red
    exit 1
}