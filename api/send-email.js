// This file runs on Vercel's server, NOT in the visitor's browser.
// That's what keeps your Resend API key private and safe.
// It receives { to, subject, html } from the website and sends the
// actual email using the secret key stored in Vercel's environment variables.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set in Vercel environment variables.");
    return res.status(500).json({ error: "Email service is not configured." });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TrustCo Tech <noreply@trustcotech.xyz>",
        to,
        subject,
        html,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Resend error:", data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Resend request failed:", err);
    return res.status(500).json({ error: err.message });
  }
};
