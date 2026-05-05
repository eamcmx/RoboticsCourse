#!/usr/bin/env bash
# ============================================================
# deploy.sh — push this repo to eamcmx/RoboticsCourse and
# nudge GitHub Pages.
# ------------------------------------------------------------
# First-time:
#   ./deploy.sh init
# Subsequent updates:
#   ./deploy.sh "your commit message"
# ============================================================

set -e

REPO_URL="https://github.com/eamcmx/RoboticsCourse.git"

if [ "$1" = "init" ]; then
  if [ -d ".git" ]; then
    echo "Already initialised as a git repo. Use ./deploy.sh \"message\" instead."
    exit 1
  fi
  git init
  git branch -m main
  git add -A
  git commit -m "Initial commit: course landing + Lecture 01 prototype"
  git remote add origin "$REPO_URL"
  git push -u origin main
  echo
  echo "Pushed to $REPO_URL"
  echo "Now go to: https://github.com/eamcmx/RoboticsCourse/settings/pages"
  echo "Set Source = 'Deploy from a branch' / Branch = main / Folder = / (root)"
  echo "Site will appear at: https://eamcmx.github.io/RoboticsCourse/"
  exit 0
fi

MSG="${1:-update}"
git add -A
git commit -m "$MSG" || { echo "nothing to commit"; exit 0; }
git push
echo "Pushed: $MSG"
