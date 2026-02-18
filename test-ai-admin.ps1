# Test AI Admin Help endpoint
Write-Host "=== Testing AI Admin Help Endpoint ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"

# Step 1: Sign in as admin
Write-Host "`n1. Signing in as admin..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-WebRequest -Uri "$baseUrl/api/signin" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    if ($data.status -eq 'success') {
        Write-Host "   OK Signed in as admin" -ForegroundColor Green
    } else {
        Write-Host "   FAIL Sign-in failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   FAIL Sign-in error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Test AI admin help
Write-Host "`n2. Testing AI admin help..." -ForegroundColor Yellow
$aiBody = @{
    question = "How do I upload a video for a lesson?"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/ai/admin-help" -Method POST -Body $aiBody -ContentType "application/json" -WebSession $session -UseBasicParsing
    
    Write-Host "   Response Status: $($response.StatusCode)" -ForegroundColor Cyan
    
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "   OK AI response received" -ForegroundColor Green
        Write-Host "`n   AI Answer:" -ForegroundColor Cyan
        Write-Host "   $($data.answer)" -ForegroundColor White
        Write-Host "`n   Remaining questions: $($data.remainingQuestions)" -ForegroundColor Cyan
    } else {
        Write-Host "   FAIL No success in response" -ForegroundColor Red
    }
} catch {
    Write-Host "   FAIL AI help error" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    # Try to get more error details
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Server response: $errorBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
