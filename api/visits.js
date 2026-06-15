/* Vercel serverless — shared family visit data.
   Reads/writes data/visits.json via GitHub (triggers redeploy) and
   Vercel Blob (instant cross-device sync without waiting for deploy). */

const FILE_PATH = "data/visits.json";
const BLOB_PATH = "countrytrack/visits.json";

function repo() {
  const owner = process.env.GITHUB_OWNER || "lakshsarda137";
  const name = process.env.GITHUB_REPO || "CountryTrack";
  return { owner, name };
}

async function readGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const { owner, name } = repo();
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${FILE_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return null;
  const meta = await res.json();
  const text = Buffer.from(meta.content, meta.encoding || "base64").toString("utf8");
  const data = JSON.parse(text);
  data._sha = meta.sha;
  return data;
}

async function writeGitHub(payload) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const { owner, name } = repo();
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${FILE_PATH}`;
  const existing = await readGitHub();
  const body = {
    message: `CountryTrack: sync visits (${new Date().toISOString()})`,
    content: Buffer.from(JSON.stringify(payload, null, 2)).toString("base64"),
  };
  if (existing?._sha) body.sha = existing._sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function readBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PATH, token: process.env.BLOB_READ_WRITE_TOKEN });
    const hit = blobs.find(b => b.pathname === BLOB_PATH) || blobs[0];
    if (!hit?.url) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function writeBlob(payload) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return true;
  } catch (e) {
    console.error("[visits] blob write failed", e);
    return false;
  }
}

async function readStatic(req) {
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const res = await fetch(`${proto}://${host}/${FILE_PATH}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const blob = await readBlob();
    const gh = await readGitHub();
    const pick = [blob, gh].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
    if (pick) {
      const { _sha, ...out } = pick;
      return res.status(200).json(out);
    }
    const stat = await readStatic(req);
    return res.status(200).json(stat || { version: 1, savedAt: 0, visits: {} });
  }

  if (req.method === "PUT") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body?.visits || typeof body.visits !== "object") {
      return res.status(400).json({ error: "Missing visits object" });
    }
    const payload = {
      version: 1,
      savedAt: Date.now(),
      visits: body.visits,
    };

    const blobOk = await writeBlob(payload);
    const gitOk = await writeGitHub(payload);

    if (!blobOk && !gitOk && !process.env.GITHUB_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({
        error: "Cloud sync not configured. Add BLOB_READ_WRITE_TOKEN or GITHUB_TOKEN in Vercel.",
      });
    }

    return res.status(200).json({ ...payload, synced: { blob: blobOk, github: gitOk } });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
