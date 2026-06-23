@echo off
REM ============================================================
REM Поток local dev launcher
REM Forces vite to bind on IPv4 127.0.0.1:3000 (vite v6 default
REM is IPv6 [::1] which Chrome/Edge often can't reach).
REM ============================================================

cd /d "%~dp0"

echo.
echo === Поток dev server ===
echo Will bind on:  http://127.0.0.1:3000/
echo Press Ctrl+C in this window to stop the server.
echo.

call npm run dev -- --host 127.0.0.1

REM If npm exits, pause so the window doesn't disappear.
pause
