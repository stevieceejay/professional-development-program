# Test script for lesson assignment functionality
Write-Host "=== Testing Lesson Assignment Functionality ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"
$pass = $true

# Test 1: Check if lessons page loads
Write-Host "`n1. Testing lessons page load..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/lessons.html" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   OK Lessons page loads successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "   FAIL Lessons page failed to load" -ForegroundColor Red
    $pass = $false
}

# Test 2: Check if lessons API works
Write-Host "`n2. Testing lessons API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/lessons" -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    if ($data.status -eq 'success' -and $data.data.Count -ge 12) {
        Write-Host "   OK Lessons API returns $($data.data.Count) lessons" -ForegroundColor Green
    } else {
        Write-Host "   FAIL Expected at least 12 lessons" -ForegroundColor Red
        $pass = $false
    }
} catch {
    Write-Host "   FAIL Lessons API failed" -ForegroundColor Red
    $pass = $false
}

# Test 3: Sign in as student
Write-Host "`n3. Testing student sign-in..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "alice"
        password = "alice123"
    } | ConvertTo-Json

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-WebRequest -Uri "$baseUrl/api/signin" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -UseBasicParsing

    $data = $response.Content | ConvertFrom-Json
    if ($data.status -eq 'success') {
        Write-Host "   OK Student signed in as $($data.user.username)" -ForegroundColor Green
    } else {
        Write-Host "   FAIL Sign-in failed" -ForegroundColor Red
        $pass = $false
    }
} catch {
    Write-Host "   FAIL Sign-in error" -ForegroundColor Red
    $pass = $false
}

# Test 4: Check database submissions
Write-Host "`n4. Checking database submissions..." -ForegroundColor Yellow
try {
    $dbPath = "C:\Users\NewAdmin\Documents\ARG-professional-developement\backend\data\project.db"
    $count = sqlite3 $dbPath "SELECT COUNT(*) FROM submissions;"
    Write-Host "   OK Total submissions in database: $count" -ForegroundColor Green
} catch {
    Write-Host "   WARN Could not query database" -ForegroundColor Yellow
}

# Test 5: Test admin submissions endpoint
Write-Host "`n5. Testing admin submissions view..." -ForegroundColor Yellow
try {
    # Sign in as admin
    $adminBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-WebRequest -Uri "$baseUrl/api/signin" -Method POST -Body $adminBody -ContentType "application/json" -WebSession $adminSession -UseBasicParsing

    # Get all submissions as admin
    $response = Invoke-WebRequest -Uri "$baseUrl/api/submissions" -Method GET -WebSession $adminSession -UseBasicParsing

    $data = $response.Content | ConvertFrom-Json
    if ($data.status -eq 'success') {
        Write-Host "   OK Admin can view all submissions: $($data.data.Count) total" -ForegroundColor Green
    }
} catch {
    Write-Host "   FAIL Admin submissions view failed" -ForegroundColor Red
    $pass = $false
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
if ($pass) {
    Write-Host "OK All critical tests passed!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor White
    Write-Host "  1. Visit http://localhost:8080/lessons.html" -ForegroundColor White
    Write-Host "  2. Sign in as alice/alice123 or bob/bob123" -ForegroundColor White
    Write-Host "  3. Select a week and submit assignments" -ForegroundColor White
    Write-Host "  4. Visit http://localhost:8080/admin.html as admin/admin123 to view submissions" -ForegroundColor White
} else {
    Write-Host "FAIL Some tests failed" -ForegroundColor Red
}
