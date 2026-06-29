#!/bin/bash
# keep-alive.sh - Restarts Next.js if it crashes
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js..." >> /home/z/my-project/dev.log
  PORT=3000 npx next start >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
  lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
  sleep 1
done