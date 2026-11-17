#!/bin/bash
# usage: run.sh SCN [STEP_ms] [N] [DURING_s]  -> plays SCN slow-motion, frames in shots/cut-inside, log in $TMPLOG
cd /home/claude/alrashed
rm -f shots/cut-inside/${1}_*.png shots/cut-inside/sheet_${1}_*.png
SCN=$1 STEP=${2:-1500} N=${3:-40} DURING=${4:-6} node tools/shot.mjs --out=shots/cut-inside --size=640x400 --wait=6000 --script=tools/steps/cut-inside/play.mjs "name=x_$1" 2>&1 | grep -v -E "^\s+shot " > shots/cut-inside/log_$1.txt
cat shots/cut-inside/log_$1.txt | cut -c1-260
