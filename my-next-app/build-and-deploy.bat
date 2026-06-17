@echo off
cd /d E:\Sites\Traxion_Build_NER1

echo [1] Stopping PM2 and Node...
call pm2 stop traxion 2>nul
call pm2 delete traxion 2>nul
taskkill /F /IM node.exe 2>nul

echo [2] Removing old build...
rmdir /s /q .next 2>nul

echo [3] Installing dependencies...
call npm install --legacy-peer-deps

echo [4] Building...
call npm run build
if %errorlevel% neq 0 (
    echo BUILD FAILED
    pause
    exit /b 1
)

echo [5] Copying static and public files...
xcopy /E /I /Y ".next\static" ".next\standalone\.next\static"
xcopy /E /I /Y "public" ".next\standalone\public"

echo [6] Writing web.config...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="Static_Next" stopProcessing="true"^>
echo           ^<match url="^_next/(.*)" /^>
echo           ^<conditions^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" /^>
echo           ^</conditions^>
echo           ^<action type="None" /^>
echo         ^</rule^>
echo         ^<rule name="Static_Public" stopProcessing="true"^>
echo           ^<match url="^(images^|fonts^|icons^|favicon.ico)(.*)" /^>
echo           ^<conditions^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" /^>
echo           ^</conditions^>
echo           ^<action type="None" /^>
echo         ^</rule^>
echo         ^<rule name="ReverseProxy" stopProcessing="true"^>
echo           ^<match url="(.*)" /^>
echo           ^<action type="Rewrite" url="http://localhost:3000/{R:1}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo     ^<security^>
echo       ^<requestFiltering^>
echo         ^<requestLimits maxQueryString="32768" /^>
echo       ^</requestFiltering^>
echo     ^</security^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo [7] Starting PM2...
cd .next\standalone
call pm2 start server.js --name "traxion"
call pm2 save
cd /d E:\Sites\Traxion_Build_NER1

echo [8] Restarting IIS...
iisreset

echo.
echo ========================================
echo DONE - https://testfrontend.traxion.in
echo ========================================
pause