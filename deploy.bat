@echo off
REM deploy.bat — Push zu GitHub + Deploy zu Vercel Production
REM Verwendung: deploy.bat  (Doppelklick oder in Terminal)

echo.
echo === Nachbar.io — Deploy to Production ===
echo.

REM 1. Push zu GitHub
echo Pushing to GitHub (origin/master)...
git push origin master
if errorlevel 1 (
    echo FEHLER: Git push fehlgeschlagen!
    pause
    exit /b 1
)
echo Push erfolgreich!

echo.

REM 2. Deploy zu Vercel
echo Deploying to Vercel Production...
call npx vercel --prod --yes
if errorlevel 1 (
    echo FEHLER: Vercel deploy fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo === Deployment abgeschlossen! ===
echo https://nachbar-io.vercel.app
echo.
pause
