# Putting the app online (free), step by step

You need: a computer with Node.js 20+ installed, a free Cloudflare account, and (only for creative mode) a free Google AI Studio key and a free Azure Speech key. Without the keys the app still works: exam, results and the chart need only Cloudflare.

Everything below uses the free plans. Nothing here is done for you automatically.

## 1. Cloudflare account
1. Go to https://dash.cloudflare.com/sign-up and create an account (email + password). Confirm the email.

## 2. Get the project ready
1. Open a terminal in the project folder (`alrashed`) and run `npm install` once.
2. In the `workers` folder everything is already written. You only fill in placeholders.

## 3. Create the database (D1)
1. In the terminal: `cd workers` then `npx wrangler login` (a browser opens: click Allow).
2. `npx wrangler d1 create alrashed-results`. It prints a `database_id`. Open `workers/wrangler.toml` and replace `REPLACE_WITH_DATABASE_ID` with it.
3. Create the tables: `npx wrangler d1 execute alrashed-results --remote --file=schema.sql`.

## 4. Secrets (keys never go in the app)
Run each command and paste the value when asked:
- `npx wrangler secret put ADMIN_PIN` : a long PIN only you know (resets the teacher PIN).
- `npx wrangler secret put GEMINI_API_KEY` : from https://aistudio.google.com/apikey (free). Needed for creative mode and the optional online judge.
- `npx wrangler secret put AZURE_SPEECH_KEY` and `npx wrangler secret put AZURE_SPEECH_REGION` : create a free "Speech" resource (F0 plan) in the Azure portal; copy Key 1 and the region (for example `uaenorth`). Needed only for creative mode's voice.

## 5. Deploy the Worker
1. Still in `workers`: `npx wrangler deploy`.
2. It prints an address such as `https://alrashed-api.YOURNAME.workers.dev`. Test it: open `https://alrashed-api.YOURNAME.workers.dev/api/health` in a browser; you should see `{"ok":true}`.
3. Optional but recommended after step 6: in `wrangler.toml` set `ALLOWED_ORIGIN` to your site address (for example `https://alrashed.pages.dev`) and run `npx wrangler deploy` again.

## 6. Deploy the website (Cloudflare Pages)
1. In the Cloudflare dashboard open Workers & Pages, Create, Pages, "Upload assets" (or connect your Git repository).
2. Tell the app where the Worker is. In the project folder create a file named `.env.production` containing one line: `VITE_API_BASE=https://alrashed-api.YOURNAME.workers.dev` (no slash at the end).
3. Build: `npm run build` (in the project folder, not `workers`). This creates the `dist` folder.
4. Upload the `dist` folder in the Pages page (or run `npx wrangler pages deploy dist --project-name alrashed`). You get `https://alrashed.pages.dev`.
5. If you use Git instead of uploading: Build command `npm run build`, output folder `dist`, and add the variable `VITE_API_BASE` under Settings, Environment variables.

## 7. First use
1. Open the site on a tablet, add it to the home screen (works offline after the first load).
2. Open Settings, press «لَوْحَةُ النَّتَائِجِ» and choose the 4-digit teacher PIN right away (the first person to set it owns it).
3. Run a test; the result appears in the chart (all devices when online, this device when offline). Results taken offline are sent when the internet returns.

## If something goes wrong
- The chart shows «هَذَا الْجِهَازُ»: the site cannot reach the Worker. Check `VITE_API_BASE`, that you rebuilt after changing it, and `/api/health`.
- Forgot the teacher PIN: press «نَسِيتُ الرَّقْمَ» in the dashboard and type the `ADMIN_PIN` secret (needs internet).
- Changing a secret: run its `wrangler secret put` command again, no redeploy needed.
- Free limits: Gemini free tier allows only a few requests a minute (the Worker also limits each device); Azure F0 gives 500,000 characters of voice a month.
