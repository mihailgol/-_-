@echo off
title ExamHub Local Server
echo ==================================================
echo     Запуск локального сервера ExamHub...
echo ==================================================

rem Проверяем наличие Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Node.js не найден. Установите его с сайта: https://nodejs.org/
    echo     После установки запустите start.bat снова.
    echo.
    pause
    exit /b 1
)

rem Проверяем наличие зависимостей
if not exist node_modules (
    echo [*] Устанавливаем зависимости...
    call npm install
)

rem Запускаем сервер в этом же окне (фоновый режим)
start /b node server/index.js

echo Сервер запущен на: http://localhost:8000
rem Даём серверу время подняться, затем открываем браузер
timeout /t 2 /nobreak >nul
start "" http://localhost:8000

echo Для остановки сервера закройте это окно.
echo ==================================================
pause
