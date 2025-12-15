const crypto = require("crypto");

function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing Cloudinary env vars" }),
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // MUST include source=uw because the Upload Widget sends it
    const paramsToSign = {
      folder: body.folder || "puzzle-requests",
      source: "uw",
      timestamp,
    };

    const signature = signParams(paramsToSign, apiSecret);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder: paramsToSign.folder,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
