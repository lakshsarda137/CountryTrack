# CountryTrack

Family travel atlas — track countries visited on an interactive globe and flat map.

## Run locally

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Deploy on Vercel

Import this repo in [Vercel](https://vercel.com/new). No build step is required — it deploys as a static site with serverless API routes.

### Cross-device sync (required for laptop ↔ phone)

Edits sync via `/api/visits`. Configure **one or both** in Vercel → Project → Settings → Environment Variables:

1. **`BLOB_READ_WRITE_TOKEN`** — [Create a Blob store](https://vercel.com/docs/storage/vercel-blob) in your Vercel project (instant sync, no deploy wait).

2. **`GITHUB_TOKEN`** — GitHub PAT with `Contents: Read and write` on this repo. Commits `data/visits.json` and triggers a redeploy (backup + static fallback).

Optional: `GITHUB_OWNER`, `GITHUB_REPO` (defaults to `lakshsarda137/CountryTrack`).

After adding env vars, redeploy once. All devices poll every 20s and refresh when you switch back to the tab.
