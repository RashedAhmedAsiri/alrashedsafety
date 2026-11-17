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
