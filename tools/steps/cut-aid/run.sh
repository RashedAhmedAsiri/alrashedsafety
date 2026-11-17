#!/bin/bash
# usage: run.sh SCEN TAG PROBE N   (N = number of back-to-back shots)
cd /home/claude/alrashed
T=$(python3 -c "print(','.join(['0']*$4))")
SCEN=$1 TAG=$2 PROBE=$3 TIMES=$T node tools/shot.mjs --out=shots/cut-aid --wait=6000 --size=${SIZE:-640x400} --script=tools/steps/cut-aid/play.mjs "name=x" > /tmp/claude-0/$2.log 2>&1
echo done >> /tmp/claude-0/$2.log
