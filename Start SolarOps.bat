@echo off
title SolarOps Launcher
echo ========================================
echo   SolarOps Server Launcher
echo ========================================
echo.

:: Run the PowerShell script with bypass execution policy
powershell -ExecutionPolicy Bypass -File "C:\Users\lenna\Downloads\VS\SolarOps-main\Start-SolarOps.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Something went wrong. Press any key to close...
    pause >nul
)
