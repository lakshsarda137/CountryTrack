/* Quick diagnostic — visit /api/debug to see what env vars are present and whether blob is reachable. */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasGitHub = !!process.env.GITHUB_TOKEN;

  let blobRead = null;
  if (hasBlob) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "countrytrack/", token: process.env.BLOB_READ_WRITE_TOKEN });
      blobRead = { ok: true, count: blobs.length, paths: blobs.map(b => b.pathname) };
    } catch (e) {
      blobRead = { ok: false, error: String(e) };
    }
  }

  res.status(200).json({
    env: { BLOB_READ_WRITE_TOKEN: hasBlob, GITHUB_TOKEN: hasGitHub },
    blob: blobRead,
  });
};
