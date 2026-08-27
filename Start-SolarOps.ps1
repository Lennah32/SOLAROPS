# ==========================================
# SolarOps Server Launcher
# Starts both backend (Flask) and frontend (Vite) servers
# Press any key in this window to shut everything down
# ==========================================

$ProjectRoot = "C:\Users\lenna\Downloads\VS\SolarOps-main"
$BackendDir  = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "Frontend"
$PythonExe   = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
$NpmCmd      = "C:\Program Files\nodejs\npm.cmd"

# --- Helpers ---
function Test-PortReady($HostName, $Port) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect($HostName, $Port)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-AnyPortReady($Port) {
    # Try both IPv4 and IPv6 localhost variants
    if (Test-PortReady "127.0.0.1" $Port) { return $true }
    if (Test-PortReady "localhost" $Port) { return $true }
    return $false
}

function Get-ProcessUsingPort($Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    }
    return $null
}

function Wait-ForPort($Port, $Label, $MaxSeconds = 60) {
    Write-Host "Waiting for $Label on port $Port..." -NoNewline -ForegroundColor Cyan
    $elapsed = 0
    while (-not (Test-AnyPortReady $Port)) {
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host "." -NoNewline -ForegroundColor Cyan
        if ($elapsed -ge $MaxSeconds) {
            Write-Host " TIMEOUT!" -ForegroundColor Red
            return $false
        }
    }
    Write-Host " READY ($elapsed s)" -ForegroundColor Green
    return $true
}

# --- Step 1: Pre-flight port check ---
Write-Host "Checking for existing servers..." -ForegroundColor Yellow
$ports = @(5000, 5173)
$occupantsFound = $false
foreach ($port in $ports) {
    if (Test-AnyPortReady $port) {
        $occupantsFound = $true
        $proc = Get-ProcessUsingPort $port
        if ($proc) {
            Write-Host "WARNING: Port $port is already in use by process '$($proc.ProcessName)' (PID $($proc.Id))" -ForegroundColor Red
            $kill = Read-Host "Kill this process and continue? (Y/n)"
            if ($kill -eq '' -or $kill -eq 'Y' -or $kill -eq 'y') {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "Killed PID $($proc.Id)." -ForegroundColor Green
                Start-Sleep -Seconds 2
            } else {
                Write-Host "Aborting. Please free port $port and try again." -ForegroundColor Red
                Read-Host "Press Enter to exit"
                exit 1
            }
        } else {
            Write-Host "WARNING: Port $port is occupied but owner process could not be identified." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
}
if (-not $occupantsFound) {
    Write-Host "Ports are free." -ForegroundColor Green
}

# --- Step 2: Cleanup old SolarOps processes (targeted) ---
Write-Host "`nCleaning up old SolarOps processes..." -ForegroundColor Yellow

# Kill Python processes running app.py from our backend folder
Get-Process python* -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        return ($cmd -like "*app.py*") -and ($cmd -like "*$BackendDir*" -or $cmd -like "*$ProjectRoot*")
    } catch { return $false }
} | ForEach-Object {
    Write-Host "  Stopping Python app.py (PID $($_.Id))" -ForegroundColor DarkYellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Kill Node processes running npm run dev from our Frontend folder
Get-Process node* -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        return ($cmd -like "*vite*" -or $cmd -like "*npm*") -and ($cmd -like "*$FrontendDir*" -or $cmd -like "*$ProjectRoot*")
    } catch { return $false }
} | ForEach-Object {
    Write-Host "  Stopping Node/vite (PID $($_.Id))" -ForegroundColor DarkYellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2
Write-Host "Cleanup done." -ForegroundColor Green

# --- Step 3: Start Backend ---
Write-Host "`nStarting Flask backend..." -ForegroundColor Cyan
$BackendProc = Start-Process -FilePath $PythonExe `
    -ArgumentList "app.py" `
    -WorkingDirectory $BackendDir `
    -WindowStyle Normal -PassThru

if (-not (Wait-ForPort 5000 "Backend" 30)) {
    Write-Host "Backend failed to start. Check the backend window for errors." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Step 4: Start Frontend ---
Write-Host "`nStarting Vite frontend..." -ForegroundColor Cyan
$FrontendProc = Start-Process -FilePath $NpmCmd `
    -ArgumentList "run","dev" `
    -WorkingDirectory $FrontendDir `
    -WindowStyle Normal -PassThru

$frontendReady = Wait-ForPort 5173 "Frontend" 60
if (-not $frontendReady) {
    Write-Host "`nFrontend port check timed out, but the server may still be starting." -ForegroundColor Yellow
    Write-Host "Check the frontend window — if it shows 'Local: http://localhost:5173/' then it's fine." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway and open browser? (Y/n)"
    if ($continue -ne '' -and $continue -ne 'Y' -and $continue -ne 'y') {
        Write-Host "Aborting." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# --- Step 5: Open Browser ---
Start-Process "http://localhost:5173"

# --- Step 6: Status Monitor ---
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  SolarOps is running!`n" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:5000" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`n  Press any key to STOP all servers." -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Green

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# --- Step 7: Graceful Shutdown ---
Write-Host "`nShutting down servers..." -ForegroundColor Yellow

if ($BackendProc -and -not $BackendProc.HasExited) {
    Stop-Process -Id $BackendProc.Id -Force -ErrorAction SilentlyContinue
}
if ($FrontendProc -and -not $FrontendProc.HasExited) {
    Stop-Process -Id $FrontendProc.Id -Force -ErrorAction SilentlyContinue
}

# Also kill any stragglers (same targeted logic)
Get-Process python* -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        return ($cmd -like "*app.py*") -and ($cmd -like "*$BackendDir*" -or $cmd -like "*$ProjectRoot*")
    } catch { return $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue

Get-Process node* -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        return ($cmd -like "*vite*" -or $cmd -like "*npm*") -and ($cmd -like "*$FrontendDir*" -or $cmd -like "*$ProjectRoot*")
    } catch { return $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "All servers stopped. See you next time!" -ForegroundColor Green
Start-Sleep -Seconds 2
