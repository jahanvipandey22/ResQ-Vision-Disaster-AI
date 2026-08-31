@echo off
cd /d "C:\Users\ASUS\projects\ResQ-Vision-Disaster-AI"
title ResQ-Vision AI - Disaster Tactical Command Center
echo ===================================================================
echo   ResQ-Vision AI: Autonomous Post-Disaster Mapping Platform
echo   Team: Girls Who Master | Problem Statement ID: SOAIDEATHON-S34
echo ===================================================================
echo Starting Local Flask Server...
start "" "http://127.0.0.1:5000"
python app.py
pause
