@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [Dunia AI] Node.js est introuvable. Installez Node.js 22 ou plus recent.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [Dunia AI] pnpm est introuvable. Installation via Corepack...
  corepack enable
  if errorlevel 1 (
    echo [Dunia AI] Impossible d'activer pnpm via Corepack.
    pause
    exit /b 1
  )
)

if not exist "node_modules" (
  echo [Dunia AI] Installation des dependances...
  pnpm install
  if errorlevel 1 (
    echo [Dunia AI] Echec de pnpm install.
    pause
    exit /b 1
  )
)

echo [Dunia AI] Generation Prisma...
pnpm prisma generate
if errorlevel 1 (
  echo [Dunia AI] Echec de prisma generate.
  pause
  exit /b 1
)

echo [Dunia AI] Synchronisation SQLite...
pnpm prisma db push
if errorlevel 1 (
  echo [Dunia AI] Echec de prisma db push.
  pause
  exit /b 1
)

echo [Dunia AI] Demarrage sur http://localhost:3000
pnpm dev
