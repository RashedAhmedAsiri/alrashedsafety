#!/bin/bash
# usage: sheet.sh SCN [from] [count] [cols] -> shots/cut-inside/sheet_SCN_<from>.png contact sheet of frames
cd /home/claude/alrashed/shots/cut-inside
F=${2:-0}; C=${3:-12}; COLS=${4:-3}
montage $(ls ${1}_[0-9]*.png | sort | tail -n +$((F+1)) | head -n $C) -tile ${COLS}x -geometry 480x300+2+2 -label '%t' sheet_${1}_$F.png
