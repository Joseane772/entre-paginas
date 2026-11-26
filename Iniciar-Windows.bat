@echo off
chcp 65001 >nul
title Entre Páginas
cd /d "%~dp0"

set "PORTA=3000"
if exist ".env" for /f "tokens=2 delims==" %%p in ('findstr /b /c:"PORT=" ".env"') do set "PORTA=%%p"

echo.
echo   Entre Páginas
echo   -------------
echo.

where docker >nul 2>nul
if not errorlevel 1 goto docker_instalado
echo   O Docker Desktop não está instalado.
echo   Vou abrir a página de transferência. Instala-o, abre-o uma vez
echo   e volta a fazer duplo clique neste ficheiro.
start "" "https://www.docker.com/products/docker-desktop/"
goto erro

:docker_instalado
docker info >nul 2>nul
if not errorlevel 1 goto docker_pronto
echo   A abrir o Docker Desktop. Espera um pouco...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set /a ESPERA=0
:esperar_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>nul
if not errorlevel 1 goto docker_pronto
set /a ESPERA+=1
if %ESPERA% lss 60 goto esperar_docker
echo   O Docker Desktop não arrancou. Abre-o à mão no menu Iniciar,
echo   espera que diga que está a correr e volta a abrir este ficheiro.
goto erro

:docker_pronto
echo   A arrancar o site. Da primeira vez pode demorar até 10 minutos; depois, segundos.
echo.
docker compose up -d --build
if errorlevel 1 goto falhou

echo.
echo   A preparar o site...
set /a ESPERA=0
:esperar_site
curl.exe -sf -o NUL "http://localhost:%PORTA%" >nul 2>nul
if not errorlevel 1 goto site_pronto
timeout /t 3 /nobreak >nul
set /a ESPERA+=1
if %ESPERA% lss 100 goto esperar_site

:site_pronto
set "IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress"`) do set "IP=%%i"
echo.
echo   Pronto! O Entre Páginas está a funcionar.
echo.
echo   Neste computador:            http://localhost:%PORTA%
if defined IP echo   Noutros aparelhos da casa:   http://%IP%:%PORTA%
echo.
echo   Para desligar, faz duplo clique em Parar-Windows.bat.
echo   Fechar esta janela não desliga o site.
start "" "http://localhost:%PORTA%"
echo.
pause
exit /b 0

:falhou
echo.
echo   Algo correu mal. Lê as mensagens acima ou consulta COMO-INSTALAR.md, secção «Se alguma coisa correr mal».
:erro
echo.
pause
exit /b 1
