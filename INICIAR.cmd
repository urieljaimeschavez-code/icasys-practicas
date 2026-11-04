@echo off
cd /d "%~dp0"
set "ICASYS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
echo Abre http://127.0.0.1:4173 en tu navegador.
echo Mantén esta ventana abierta mientras usas la maqueta.
if exist "%ICASYS_NODE%" (
  "%ICASYS_NODE%" server.cjs
) else (
  node server.cjs
)
pause
