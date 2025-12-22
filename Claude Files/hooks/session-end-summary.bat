@echo off
REM Windows wrapper for session-end-summary hook
REM This handles calls with Unix-style paths and converts them to Windows paths

set HOOK_PATH=%~dp0session-end-summary.py
set PYTHON=python

REM Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    REM Try py launcher if python is not in PATH
    set PYTHON=py
)

REM Execute the Python hook script
%PYTHON% "%HOOK_PATH%" %*
