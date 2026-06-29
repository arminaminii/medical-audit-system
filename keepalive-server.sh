#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date '+%H:%M:%S')] Starting server..." >> dev.log
  node server-main.js >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Server exited (code=$EXIT_CODE), restarting in 2s..." >> dev.log
  # Kill anything on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 2
done
