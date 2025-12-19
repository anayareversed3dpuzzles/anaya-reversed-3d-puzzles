// netlify/functions/submit.js
// Receives request from Designer page -> validates -> posts to Google Apps Script -> returns OK

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Accept either naming convention (so your Netlify env vars can be named either way)
    const webhookUrl = process.env.SHEETS_WEBHOOK_URL || process.env.APPS_SCRIPT_URL; // must be /exec
    const token = process.env.SHEETS_TOKEN || process.env.PUZZLE_REQUEST_TOKEN; // same string as Apps Script SECRET_TOKEN

    if (!webhookUrl || !token) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing SHEETS_WEBHOOK_URL/APPS_SCRIPT_URL or SHEETS_TOKEN/PUZZLE_REQUEST_TOKEN" }),
      };
    }

    const data = JSON.parse(event.body || "{}");

    // --- Honeypot (spam trap) ---
    // If a bot fills this hidden field, reject silently
    if (data.company && String(data.company).trim() !== "") {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // --- Basic validation ---
    const required = ["name", "email", "size", "pieces", "total", "imageUrl"];
    for (const k of required) {
      if (!data[k] || String(data[k]).trim() === "") {
        return { statusCode: 400, body: JSON.stringify({ error: `Missing field: ${k}` }) };
      }
    }

    // Optional: enforce image minimum (matches your UI rules)
    // If you already compute imageWidth/imageHeight in the browser, enforce here too.
    const minShortestSide = 1200;
    const w = Number(data.imageWidth || 0);
    const h = Number(data.imageHeight || 0);
    if (w && h) {
      const shortest = Math.min(w, h);
      if (shortest < minShortestSide) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Image too small. Minimum shortest side is ${minShortestSide}px.` }),
        };
      }
    }

    // Send to Apps Script (token passed as querystring)
    const res = await fetch(`${webhookUrl}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        size: data.size,
        pieces: data.pieces,
        addons: data.addons || {},
        total: data.total,
        imageUrl: data.imageUrl,
        imageWidth: data.imageWidth || "",
        imageHeight: data.imageHeight || "",
        imageFormat: data.imageFormat || "",
        notes: data.notes || "",
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Sheets webhook failed", status: res.status, body: text }),
      };
    }

    if (!String(text).toUpperCase().includes("OK")) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Sheets webhook returned unexpected response", body: text }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
