@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ============================================================
echo  Talero deploy - push this folder to GitHub for Render
echo ============================================================

where git >nul 2>nul || (echo. & echo Git is not installed. Get it at https://git-scm.com then re-run. & pause & exit /b)

REM make sure git has an identity (avoids commit failure on fresh installs)
git config user.email >nul 2>nul || git config user.email "deploy@talero.local"
git config user.name  >nul 2>nul || git config user.name  "Talero Deploy"

if not exist ".git" git init
git add .
git commit -m "Talero NT Connect mock + web app" 2>nul
git branch -M main

where gh >nul 2>nul
if %errorlevel%==0 (
  echo.
  echo GitHub CLI found - creating a PRIVATE repo and pushing automatically...
  gh repo create talero-ntconnect-mock --private --source=. --remote=origin --push
) else (
  echo.
  echo No GitHub CLI detected.
  echo STEP 1: create an EMPTY repo at https://github.com/new
  echo         name it: talero-ntconnect-mock  (no README/.gitignore/license^)
  set /p REPO=STEP 2: paste the repo URL here and press Enter:
  git remote remove origin 2>nul
  git remote add origin "!REPO!"
  git push -u origin main
)

for /f "delims=" %%u in ('git remote get-url origin 2^>nul') do set ORIGIN=%%u
echo.
echo ============================================================
echo  Pushed. Your repo: !ORIGIN!
echo.
echo  Finish on Render (you're already logged in):
echo   New +  ^>  Blueprint  ^>  pick talero-ntconnect-mock  ^>  Apply
echo  Live URL appears in ~2 minutes.
echo ============================================================
pause
