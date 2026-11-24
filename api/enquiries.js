const fields = {
  company: 120, contact: 120, email: 254, website: 500, country: 100,
  markets: 240, category: 120, services: 350, details: 2000
};

function httpsUrl(value) {
  if (typeof value !== "string" || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password ? url : null;
}

function configuration(env) {
  const sink = httpsUrl(env.LEAD_COLLECTOR_URL);
  const origins = (env.LEAD_ALLOWED_ORIGINS ?? "").split(",")
    .map(value => httpsUrl(value.trim())?.origin).filter(Boolean);
  return sink && origins.length && env.LEAD_COLLECTOR_TOKEN && env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY
    ? { sink, origins, token: env.LEAD_COLLECTOR_TOKEN, secret: env.TURNSTILE_SECRET, siteKey: env.TURNSTILE_SITE_KEY }
    : null;
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || body.fax ||
      body.consent !== "yes" || !["pilot", "quote", "contact"].includes(body.intent)) return null;
  const orders = typeof body.orders === "string" && /^\d{1,8}$/.test(body.orders) ? Number(body.orders) : -1;
  if (orders < 0 || orders > 10_000_000) return null;
  const data = { intent: body.intent, orders, consent: true };
  for (const [name, limit] of Object.entries(fields)) {
    const value = typeof body[name] === "string" ? body[name].trim() : "";
    if (value.length > limit || (!value && name !== "details")) return null;
    data[name] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !httpsUrl(data.website)) return null;
  return data;
}

export function enquiries(env = process.env, send = fetch) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    const config = configuration(env);
    if (req.method === "GET") return res.status(200).json({
      available: Boolean(config), siteKey: config?.siteKey ?? null,
      analytics: env.ENABLE_VERCEL_ANALYTICS === "1" && env.VERCEL_ENV === "production"
    });
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ message: "Method not allowed." });
    }
    if (!config) return res.status(503).json({ message: "Enquiries are currently unavailable." });
    const origin = req.headers.origin;
    if (!config.origins.includes(origin)) return res.status(403).json({ message: "Enquiry origin not allowed." });
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) {
      return res.status(415).json({ message: "Unsupported enquiry format." });
    }
    if (Number(req.headers["content-length"]) > 12_000 || JSON.stringify(req.body ?? null).length > 12_000) {
      return res.status(413).json({ message: "The enquiry is too long." });
    }
    const data = validate(req.body);
    const proof = req.body?.challenge;
    if (!data || typeof proof !== "string" || !proof || proof.length > 2048) {
      return res.status(400).json({ message: "Check the form and complete the spam prevention check." });
    }

    try {
      const challenge = await send("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", body: new URLSearchParams({ secret: config.secret, response: proof }),
        signal: AbortSignal.timeout(4000), redirect: "error"
      });
      if (!challenge.ok) throw new Error("Challenge service failed");
      const verified = await challenge.json();
      if (verified.success !== true || verified.hostname !== new URL(origin).hostname || verified.action !== "merchant_enquiry") {
        return res.status(400).json({ message: "Please repeat the spam prevention check and try again." });
      }
      const receipt = await send(config.sink, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
        body: JSON.stringify({ ...data, source: "fullbox-corporate", consentAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(4500), redirect: "error"
      });
      if (receipt.ok && (await receipt.json()).accepted === true) {
        return res.status(201).json({ accepted: true, message: "Your enquiry has been received. Fullbox will review the details and contact you by email." });
      }
    } catch {
      // Provider responses and merchant details stay out of logs and the browser.
    }
    return res.status(502).json({ message: "We could not confirm receipt of your enquiry. Please try again." });
  };
}

export default enquiries();
