@echo off
rem Builds the Microsoft Store package on this PC and installs it for a test (nothing is uploaded). See test-store-local.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-store-local.ps1"
echo.
pause
