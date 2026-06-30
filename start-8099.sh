#!/bin/bash
cd /home/z/my-project
while true; do
  node /home/z/my-project/test-server.js >> /tmp/srv8099.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited (code=$EXIT_CODE), restarting in 1s..." >> /tmp/srv8099.log
  sleep 1
done
