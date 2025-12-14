// netlify/functions/quote.js
// Server-side quote calculation + validation (defense-in-depth)

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body || "{}");

    const size = body.size; // "100" or "150"
    const pieces = Number(body.pieces || 100);

    // Uploaded image metadata from Cloudinary widget result.info
    const image = body.image || {};
    const format = (image.format || "").toLowerCase();
    const width = Number(image.width || 0);
    const height = Number(image.height || 0);

    const addons = body.addons || {};
    const cleanup = Boolean(addons.cleanup);
    const rush = Boolean(addons.rush);
    const multicolor = Boolean(addons.multicolor);

    // ---- Validate options ----
    if (!["100", "150"].includes(String(size))) {
      return json(400, { error: "Invalid size. Must be 100 or 150." });
    }
    if (pieces !== 100) {
      return json(400, { error: "Invalid pieces. Only 100 pieces supported right now." });
    }

    // ---- Validate image (defense-in-depth) ----
    const allowed = new Set(["jpg", "jpeg", "png"]);
    if (format && !allowed.has(format)) {
      return json(400, { error: "Invalid image format. Use JPG or PNG." });
    }

    const shortestSide = Math.min(width || 0, height || 0);
    const minShortest = 1200;      // minimum acceptable
    const recommended = 2000;      // recommended quality

    // We don’t hard-fail low-res; we warn. But we DO fail if metadata is clearly invalid.
    if ((width && height) && shortestSide < 300) {
      return json(400, { error: "Image resolution too small to quote. Upload a higher-resolution image." });
    }

    // ---- Pricing rules ----
    const base = (String(size) === "100") ? 38 : 60;

    const breakdown = [{ label: `Base (${size}×${size}, 100 pcs)`, amount: base }];

    if (multicolor) breakdown.push({ label: "Multi-color", amount: 5 });
    if (cleanup) breakdown.push({ label: "Image cleanup", amount: 15 });
    if (rush) breakdown.push({ label: "Rush", amount: 15 });

    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

    // ---- Quality notes ----
    const notes = [];
    if (width && height) {
      if (shortestSide < minShortest) notes.push(`⚠️ Low resolution (${width}×${height}). Minimum is ${minShortest}px on shortest side.`);
      else if (shortestSide < recommended) notes.push(`👍 OK (${width}×${height}). For best results, use ${recommended}px+ shortest side.`);
      else notes.push(`✅ Great resolution (${width}×${height}).`);
    } else {
      notes.push("ℹ️ Image metadata not provided. Upload an image to get quality feedback.");
    }

    return json(200, { total, breakdown, notes });
  } catch (e) {
    return json(500, { error: e.message || "Server error" });
  }
};
