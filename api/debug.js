/* Quick diagnostic */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";

  let blobRead = null, blobWrite = null;
  if (blobToken) {
    try {
      const { list, put } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "countrytrack/", token: blobToken });
      blobRead = { ok: true, count: blobs.length };
      const result = await put("countrytrack/debug-test.json", JSON.stringify({ t: Date.now() }), {
        access: "public", addRandomSuffix: false, allowOverwrite: true,
        contentType: "application/json", token: blobToken,
      });
      blobWrite = { ok: true, url: result.url };
    } catch (e) {
      blobRead = blobRead || { ok: false };
      blobWrite = { ok: false, error: String(e) };
    }
  }

  res.status(200).json({
    BLOB_READ_WRITE_TOKEN: blobToken ? blobToken.slice(0, 24) + "…" : null,
    blobRead,
    blobWrite,
  });
};
