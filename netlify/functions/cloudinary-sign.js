// netlify/functions/cloudinary-sign.js
// Generates a Cloudinary signed upload signature

const crypto = require("crypto");

function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
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

    const paramsToSign = {
      timestamp,
      folder: "puzzle-requests",
      source: "uw";
    };

    const signature = signParams(paramsToSign, apiSecret);

    return {
      statusCode: 200,
      body: JSON.stringify({
        cloudName,
        apiKey,
        timestamp,
        folder: paramsToSign.folder,
        signature,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
