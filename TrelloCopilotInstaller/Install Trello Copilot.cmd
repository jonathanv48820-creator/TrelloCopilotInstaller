@echo off
title Trello Copilot Setup

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-TrelloCopilot.ps1"

if errorlevel 1 (
    echo.
    echo Trello Copilot installation did not complete successfully.
    echo Review the message above.
    echo.
    pause
)
