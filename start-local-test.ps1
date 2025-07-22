# PAR Brink Local Test Environment
# This script starts the Azure Functions locally and opens the test page

Write-Host "🍕 Starting PAR Brink Local Test Environment..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "host.json")) {
    Write-Host "❌ Please run this script from the sync-app-backend directory" -ForegroundColor Red
    exit 1
}

# Start Azure Functions in background
Write-Host "🚀 Starting Azure Functions locally..." -ForegroundColor Yellow
$functionsProcess = Start-Process -FilePath "func" -ArgumentList "start", "--verbose" -PassThru -WindowStyle Minimized

# Wait a moment for functions to start
Start-Sleep -Seconds 3

# Check if functions are running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:7071/api/health" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Azure Functions started successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ Functions may still be starting..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️ Functions may still be starting... ($($_.Exception.Message))" -ForegroundColor Yellow
}

# Open test page in default browser
$testPagePath = Join-Path -Path (Get-Location) -ChildPath "test-par-brink-local.html"
Write-Host "🌐 Opening test page: $testPagePath" -ForegroundColor Cyan

if (Test-Path $testPagePath) {
    Start-Process $testPagePath
    Write-Host "✅ Test page opened in browser!" -ForegroundColor Green
}
else {
    Write-Host "❌ Test page not found: $testPagePath" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Local Test Environment Ready:" -ForegroundColor Green
Write-Host "   • Azure Functions: http://localhost:7071" -ForegroundColor White
Write-Host "   • Health Check: http://localhost:7071/api/health" -ForegroundColor White
Write-Host "   • Test Page: file://$testPagePath" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Usage Instructions:" -ForegroundColor Cyan
Write-Host "   1. Enter your PAR Brink access token and location token" -ForegroundColor White
Write-Host "   2. Set business date (defaults to today)" -ForegroundColor White
Write-Host "   3. Test individual API endpoints" -ForegroundColor White
Write-Host "   4. Compare Azure Function vs Direct SOAP calls" -ForegroundColor White
Write-Host ""
Write-Host "⏹️ To stop: Close this window or press Ctrl+C" -ForegroundColor Yellow

# Keep script running and monitor
try {
    while ($true) {
        Start-Sleep -Seconds 30
        if ($functionsProcess -and $functionsProcess.HasExited) {
            Write-Host "❌ Azure Functions process has stopped!" -ForegroundColor Red
            break
        }
        Write-Host "✅ Functions still running... ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Gray
    }
}
catch {
    Write-Host "🛑 Stopping..." -ForegroundColor Yellow
}
finally {
    # Clean up
    if ($functionsProcess -and -not $functionsProcess.HasExited) {
        Write-Host "🧹 Stopping Azure Functions..." -ForegroundColor Yellow
        $functionsProcess.Kill()
    }
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
}
