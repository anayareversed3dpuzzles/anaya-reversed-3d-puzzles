import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" // fine for your public landing page
    },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const puzzle_code = (data.code || "").trim().toUpperCase() || null;
    const rating = Number(data.rating);
    const comment = (data.comment || "").trim();
    const contact = (data.contact || "").trim() || null;

    // Validation
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json(400, { error: "Rating must be 1–5" });
    }
    if (!comment || comment.length < 3) {
      return json(400, { error: "Comment is required" });
    }
    if (comment.length > 2000) {
      return json(400, { error: "Comment too long" });
    }

    // Helpful metadata
    const user_agent = event.headers["user-agent"] || null;
    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["x-forwarded-for"] ||
      null;

    const { error } = await supabase.from("feedback").insert([
      {
        puzzle_code,
        rating,
        comment,
        contact,
        user_agent,
        ip
      }
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return json(500, { error: "Failed to save feedback" });
    }

    return json(200, { success: true });
  } catch (err) {
    console.error("submitFeedback error:", err);
    return json(500, { error: "Server error" });
  }
}
