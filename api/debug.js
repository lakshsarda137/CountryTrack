/* Quick diagnostic */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const allBlobKeys = Object.keys(process.env).filter(k => k.includes("BLOB") || k.includes("blob"));
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";

  let blobRead = null;
  if (blobToken) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "countrytrack/", token: blobToken });
      blobRead = { ok: true, count: blobs.length };
    } catch (e) {
      blobRead = { ok: false, error: String(e) };
    }
  }

  res.status(200).json({
    blobKeys: allBlobKeys,
    BLOB_READ_WRITE_TOKEN: blobToken ? blobToken.slice(0, 24) + "…" : null,
    blob: blobRead,
  });
};
