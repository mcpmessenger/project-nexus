# PowerShell script to seed MCP servers to Supabase
# Usage: .\scripts\run_seed.ps1

# Get Supabase connection string
# You can get this from: Supabase Dashboard > Project Settings > Database > Connection string (URI)
$connectionString = Read-Host "Enter your Supabase connection string (postgresql://...)"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "Error: Connection string is required" -ForegroundColor Red
    exit 1
}

# Path to the SQL script (relative to project root)
$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $projectRoot "scripts\009_seed_all_servers_with_logos.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: Script file not found at $scriptPath" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running seeding script..." -ForegroundColor Green
Write-Host "Script: $scriptPath" -ForegroundColor Cyan

# Run the SQL script
try {
    $result = & psql $connectionString -f $scriptPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Seeding completed successfully!" -ForegroundColor Green
        Write-Host "`nVerification: Run this query in Supabase SQL Editor:" -ForegroundColor Yellow
        Write-Host "SELECT name, logo_url, (SELECT COUNT(*) FROM mcp_tools WHERE server_id = mcp_servers.id) as tool_count FROM mcp_servers ORDER BY name;" -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Error running script:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    exit 1
}
