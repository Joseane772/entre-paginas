@echo off
chcp 65001 >nul
title Entre Páginas
cd /d "%~dp0"
echo.
echo   A desligar o Entre Páginas...
docker compose stop
echo.
echo   Desligado. Os teus dados ficam guardados; para voltar a ligar usa Iniciar-Windows.bat.
echo.
pause
