@echo off
cd /d %~dp0
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:5173
  py -m http.server 5173
) else (
  start "" http://localhost:5173
  python -m http.server 5173
)
