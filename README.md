# CountryTrack

Family travel atlas — track countries visited on an interactive globe and flat map.

## Run locally

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Cloud sync requires deploying to Vercel with env vars (see below).

## Deploy on Vercel

1. Import **[github.com/lakshsarda137/CountryTrack](https://github.com/lakshsarda137/CountryTrack)** at [vercel.com/new](https://vercel.com/new).
2. No build command — deploy as static site + serverless API.
3. **Set up sync** so laptop and phone share data → follow **[SYNC.md](./SYNC.md)** step by step.

Quick summary:

| Variable | Where the value comes from |
|----------|----------------------------|
| `BLOB_READ_WRITE_TOKEN` | Auto-created when you add a **Blob** store in Vercel and connect it to the project (Storage tab). |
| `GITHUB_TOKEN` | You create at [github.com/settings/tokens](https://github.com/settings/tokens) — fine-grained, **Contents: Read and write** on this repo only. Paste into Vercel env vars. |

After adding variables, **Redeploy** once.
