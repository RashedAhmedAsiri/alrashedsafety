#!/usr/bin/env python3
"""Free recorded voices with the `edge-tts` package (no account, no key). See docs/voice.md.

    pip install edge-tts          # and ffmpeg on PATH (for the mouth envelope)
    python tools/generate_voice_edge.py [--force] [--only=prefix] [--dry]

Writes public/audio/voice/<key>.<b|g>.mp3, <key>.<b|g>.json ([[ms, visemeId 0-21], ...]) and manifest.json,
the same files tools/generate_voice.mjs (Azure) makes. Edge gives no visemes, so the mouth timeline is computed
from the audio loudness. The job list comes from the app content via `node tools/generate_voice.mjs --dump=...`
(or pass --lines=file.json). Run it on your own computer: it needs internet access to Microsoft's service.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import shutil
import subprocess
import sys
import tempfile
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "audio" / "voice"
VOICE_ROBOT = "ar-SA-HamedNeural"  # Alrashed. The b/g files differ only in the TEXT (gender markup), not the voice.
RATE = "-8%"  # app rate 0.92
PITCH = "+8Hz"  # about the +6% of the Azure run
FRAME_MS = 40
SAMPLE_RATE = 16000

# Same openness thresholds as fakeViseme() in src/voice/speech.ts, so the runtime draws the same mouths.
def open_to_viseme(o: float) -> int:
    if o < 0.06:
        return 0
    if o < 0.22:
        return 15
    if o < 0.4:
        return 19
    if o < 0.62:
        return 4
    if o < 0.82:
        return 1
    return 2


def envelope_to_visemes(samples, rate: int = SAMPLE_RATE, frame_ms: int = FRAME_MS):
    """Mouth timeline [[ms, visemeId], ...] from mono PCM samples (ints or floats). Only changes are stored."""
    n = max(1, rate * frame_ms // 1000)
    rms = []
    for i in range(0, len(samples) - n + 1, n):
        seg = samples[i : i + n]
        rms.append(math.sqrt(sum(float(x) * float(x) for x in seg) / n))
    if not rms:
        return [[0, 0]]
    ordered = sorted(rms)
    ref = ordered[int(len(ordered) * 0.95) - 1 if len(ordered) > 1 else 0]
    floor = ref * 0.08
    if ref <= 0:
        return [[0, 0]]
    opens, prev = [], 0.0
    for r in rms:
        target = 0.0 if r <= floor else min(1.0, 0.15 + 0.85 * ((r - floor) / (ref - floor + 1e-9)) ** 0.8)
        prev = target if target > prev else prev + (target - prev) * 0.5  # open fast, close slower
        opens.append(prev)
    out, last = [], -1
    for i, o in enumerate(opens):
        v = open_to_viseme(o)
        if v != last:
            out.append([i * frame_ms, v])
            last = v
    if out[-1][1] != 0:
        out.append([len(opens) * frame_ms, 0])
    return out


def decode_pcm(mp3: Path):
    """Mono 16 kHz signed 16-bit samples of an mp3 via ffmpeg, or None when ffmpeg is missing."""
    if not shutil.which("ffmpeg"):
        return None
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
        capture_output=True,
        check=True,
    )
    a = array("h")
    a.frombytes(p.stdout[: len(p.stdout) // 2 * 2])
    if sys.byteorder == "big":
        a.byteswap()
    return a


def estimated_visemes(text: str):
    """Fallback without ffmpeg: a syllable-like open/close pattern lasting about as long as the speech."""
    secs = max(0.6, len(text) / 12 + 0.3)
    out, t, openv = [], 0, True
    while t < secs * 1000:
        out.append([t, 4 if openv else 15])
        openv = not openv
        t += 110
    out.append([int(secs * 1000), 0])
    return out


def load_jobs(lines: str | None):
    if lines:
        return json.loads(Path(lines).read_text(encoding="utf-8"))
    tmp = Path(tempfile.mkdtemp()) / "lines.json"
    subprocess.run(["node", str(ROOT / "tools" / "generate_voice.mjs"), f"--dump={tmp}"], cwd=ROOT, check=True)
    return json.loads(tmp.read_text(encoding="utf-8"))


async def synth(text: str, voice: str, path: Path):
    import edge_tts  # imported late so --dry and the self-test work without the package

    await edge_tts.Communicate(text, voice, rate=RATE, pitch=PITCH).save(str(path))


async def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="re-record existing files")
    ap.add_argument("--only", default="", help="only keys starting with this prefix")
    ap.add_argument("--dry", action="store_true", help="list what would be recorded, no network")
    ap.add_argument("--lines", help="job list JSON (default: made by node tools/generate_voice.mjs --dump)")
    ap.add_argument("--voice", default=VOICE_ROBOT)
    ap.add_argument("--voice-girl", default=None, help="voice for the .g files (default: same as --voice)")
    ap.add_argument("--retries", type=int, default=3)
    args = ap.parse_args(argv)

    jobs = [j for j in load_jobs(args.lines) if j["key"].startswith(args.only)]
    print(f"files: {len(jobs)}, characters: {sum(len(j['spoken']) for j in jobs)}")
    if args.dry:
        for j in jobs[:5]:
            print(f"  {j['key']}.{j['v']}: {j['spoken'][:60]}")
        return 0
    if not shutil.which("ffmpeg"):
        print("warning: ffmpeg not found, using an estimated mouth pattern (install ffmpeg for exact lip sync)")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "keys": {}}
    made = skipped = failed = 0
    for j in jobs:
        mp3, js = OUT_DIR / f"{j['key']}.{j['v']}.mp3", OUT_DIR / f"{j['key']}.{j['v']}.json"
        if not args.force and mp3.exists() and js.exists():
            skipped += 1
        else:
            voice = (args.voice_girl or args.voice) if j["v"] == "g" else args.voice
            ok = False
            for attempt in range(args.retries):
                try:
                    mp3.parent.mkdir(parents=True, exist_ok=True)
                    await synth(j["spoken"], voice, mp3)
                    pcm = decode_pcm(mp3)
                    js.write_text(json.dumps(envelope_to_visemes(pcm) if pcm else estimated_visemes(j["spoken"])), encoding="utf-8")
                    ok = True
                    break
                except Exception as e:  # network hiccup: retry
                    print(f"retry {j['key']}.{j['v']} ({attempt + 1}): {e}")
                    await asyncio.sleep(1.5 * (attempt + 1))
            if not ok:
                failed += 1
                print(f"FAILED {j['key']}.{j['v']}")
                continue
            made += 1
            print(f"ok {j['key']}.{j['v']}")
        manifest["keys"].setdefault(j["key"], []).append(j["v"])
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"done: {made} made, {skipped} skipped, {failed} failed; manifest lists {len(manifest['keys'])} keys")
    return 2 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
