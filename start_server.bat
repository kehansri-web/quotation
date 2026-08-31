@echo off
REM ==============================================================================
REM QuoteCraft Pro - Local Server Launcher (Windows)
REM ==============================================================================

cd /d "%~dp0"

echo ============================================================
echo Starting QuoteCraft Pro Local Server...
echo ============================================================

start http://localhost:8899

python server.py
if %ERRORLEVEL% NEQ 0 (
    python3 server.py
)

pause
