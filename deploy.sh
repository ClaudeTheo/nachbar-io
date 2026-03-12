#!/bin/bash
# deploy.sh — Push zu GitHub + Deploy zu Vercel Production
# Verwendung: ./deploy.sh  oder  bash deploy.sh
#
# Da Vercel nicht mit dem ClaudeTheo GitHub-Repo verbunden ist,
# muss nach jedem Push manuell deployed werden.
# Dieses Script macht beides in einem Schritt.

set -e

echo "🚀 Nachbar.io — Deploy to Production"
echo "======================================"

# 1. Git Status pruefen
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Es gibt uncommittete Aenderungen!"
  echo "   Bitte zuerst committen, dann erneut ausfuehren."
  git status --short
  exit 1
fi

# 2. Push zu GitHub
echo ""
echo "📤 Pushing to GitHub (origin/master)..."
git push origin master
echo "✅ Push erfolgreich"

# 3. Deploy zu Vercel
echo ""
echo "🔨 Deploying to Vercel Production..."
npx vercel --prod --yes
echo ""
echo "✅ Deployment abgeschlossen!"
echo "🌐 https://nachbar-io.vercel.app"
