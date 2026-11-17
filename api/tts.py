"""Alrashed's voice on Vercel: free Microsoft Edge neural TTS (edge-tts), returned as MP3.

    GET /api/tts?text=<arabic text>[&voice=ar-SA-HamedNeural&rate=-8%&pitch=+8Hz]

The app plays it as its 'edge' voice tier (src/voice/speech.ts). Responses are cached by Vercel's CDN, so each
line is synthesized once.
"""
import asyncio
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import edge_tts

VOICES = {"ar-SA-HamedNeural", "ar-SA-ZariyahNeural"}
MAX_CHARS = 1500


async def synth(text: str, voice: str, rate: str, pitch: str) -> bytes:
    out = bytearray()
    async for chunk in edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).stream():
        if chunk["type"] == "audio":
            out += chunk["data"]
    return bytes(out)


class handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes, ctype: str, cache: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        q = parse_qs(urlparse(self.path).query)
        text = (q.get("text") or [""])[0].strip()[:MAX_CHARS]
        voice = (q.get("voice") or ["ar-SA-HamedNeural"])[0]
        rate = (q.get("rate") or ["-8%"])[0]
        pitch = (q.get("pitch") or ["+8Hz"])[0]
        if not text or voice not in VOICES:
            self._send(400, b"bad request", "text/plain", "no-store")
            return
        try:
            audio = asyncio.run(synth(text, voice, rate, pitch))
        except Exception as e:  # network or service error
            self._send(502, str(e).encode()[:300], "text/plain", "no-store")
            return
        if not audio:
            self._send(502, b"no audio", "text/plain", "no-store")
            return
        self._send(200, audio, "audio/mpeg", "public, max-age=86400, s-maxage=31536000, immutable")
