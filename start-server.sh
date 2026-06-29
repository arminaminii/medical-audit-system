#!/bin/bash
# start-server.sh - Robust keepalive for Express server
cd /home/z/my-project

kill_server() {
  fuser -k 3000/tcp 2>/dev/null
  pkill -f 'node server-main' 2>/dev/null
  sleep 1
}

kill_server

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Express server on port 3000..." >> /home/z/my-project/dev.log
  node /home/z/my-project/server-main.js >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited (code=$EXIT_CODE), restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
  kill_server
done
