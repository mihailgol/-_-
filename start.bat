@echo off
title ExamHub Server Launcher
chcp 65001 >nul
echo ==================================================
echo     🚀 Запуск сервера и туннеля ExamHub...
echo ==================================================

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Node.js не найден. Пожалуйста, установите Node.js с https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [*] Установка зависимостей проекта...
    call npm install
)

node scripts/start-server-and-tunnel.mjs

pause
