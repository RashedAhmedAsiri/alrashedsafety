#!/bin/sh
cd "$(dirname "$0")/../../.." || exit 1
id=$1; mkdir -p shots/speak
ID=$id timeout 900 node tools/shot.mjs --out=shots/speak --size=640x400 --wait=4000 --timeout=240000 --script=tools/steps/review/speak.mjs "name=zz_$id" > shots/speak/$id.log 2>&1
echo done >> shots/speak/$id.log
