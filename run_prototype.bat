@echo off
cd /d "%~dp0"
title ResQ-Vision AI - Disaster Tactical Command Center
echo ===================================================================
echo   ResQ-Vision AI: Autonomous Post-Disaster Mapping Platform
echo   Team: Girls Who Master | Problem Statement ID: SOAIDEATHON-S34
echo ===================================================================
echo Checking and installing required packages (Flask, Flask-CORS)...
python -m pip install flask flask-cors -q 2>nul || py -m pip install flask flask-cors -q 2>nul
echo Starting Local Server...
start "" "http://127.0.0.1:5000"
python app.py || py app.py
pause
