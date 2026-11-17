#!/bin/sh
# usage: run.sh <id> [parts] [tickMs] -> shots/review/<id>/sheet.jpg and log.txt
cd "$(dirname "$0")/../../.." || exit 1
id=$1; mkdir -p shots/review/$id
ID=$id PARTS=${2:-setup,before,during,after} TICK=${3:-0} timeout 1500 node tools/shot.mjs --out=shots/review/$id --size=640x400 --wait=6000 --script=tools/steps/review/play.mjs "name=x_$id" > shots/review/$id/log.txt 2>&1
montage -label '%t' shots/review/$id/${id}_*.png -tile 4x -geometry 480x300+2+2 -pointsize 14 shots/review/$id/sheet.jpg 2>/dev/null
echo done >> shots/review/$id/log.txt
