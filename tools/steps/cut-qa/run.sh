#!/bin/sh
# usage: run.sh <id> [parts] [tickMs]   -> shots/cut-qa/<id>/ + sheet (log /tmp/qa_<id>.log)
cd "$(dirname "$0")/../../.." || exit 1
id=$1
ID=$id PARTS=${2:-setup,before,during,after} TICK=${3:-0} timeout 1500 node tools/shot.mjs --out=shots/cut-qa/$id --size=640x400 --wait=6000 --script=tools/steps/cut-qa/play.mjs "name=qa_$id" > /tmp/qa_$id.log 2>&1
montage shots/cut-qa/$id/${id}_*.png -tile 4x -geometry 400x250+2+2 -label '%t' shots/cut-qa/$id/sheet.jpg 2>/dev/null
echo done >> /tmp/qa_$id.log
