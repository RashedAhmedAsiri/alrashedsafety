# Publish on Vercel (free Hobby plan)

The app is a static Vite site, so Vercel needs no server settings (`vercel.json` is included).

## Option A: from your computer (about 2 minutes)

1. Install Node 20+ and run once: `npm install -g vercel`
2. In the project folder (`alrashed-app/code`): `npm install`
3. Run `vercel login`, then `vercel --prod`
4. Accept the defaults (framework Vite, build `npm run build`, output `dist`). Vercel prints the live link.

## Option B: from GitHub (auto-deploy on every change)

1. Put the project folder in a GitHub repository you own.
2. On vercel.com choose Add New, Project, import the repository, and press Deploy.

## After deploying

- The microphone needs HTTPS, which Vercel provides.
- Alrashed's voice: `api/tts.py` (with `requirements.txt`) is a free Vercel Python function that speaks with
  Microsoft Edge's neural voice `ar-SA-HamedNeural`. Vercel deploys it with the site and the app tries it right
  after any recorded files. Test it at `https://<your-site>.vercel.app/api/tts?text=مرحبا`.
- Recorded voice files (fully offline): see `docs/voice.md`, then rebuild and redeploy.
- The first load downloads the speech-recognition model on a device with internet; after that it works offline.

## GitHub Pages (github.io)

`.github/workflows/pages.yml` builds and publishes the site on every push to `main`
(live at `https://<user>.github.io/<repo>/`). In the repository: Settings, Pages, Source: GitHub Actions.
Pages has no Python functions, so `/api/tts` is missing there. Instead the workflow records every fixed line with the
Edge neural voice during the build (`tools/generate_voice_edge.py`, about 600 MP3 files, cached between runs), so Alrashed
speaks in any browser. Only free-typed creative-mode answers use the device voice.
To use the Edge voice, deploy once on Vercel and set a repository variable `VITE_TTS_URL` to
`https://<your-site>.vercel.app/api/tts`.
