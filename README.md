# Fullbox Africa corporate website

Static HTML, CSS and JavaScript with a Vercel Node function for merchant enquiries. The home page retains the original section URLs and calculator. Privacy and terms are separate clean URLs.

## Deployment audit

The production homepage at `www.fullboxafrica.com` matched the repository's previous `main` commit `da2ef10` byte-for-byte on 24 November 2026. GitHub recorded a successful Vercel production deployment at that commit. The ZIP in the repository contains copies of the same prototype files. The published page was a single-page site with a demo-only form, indicative pricing and unverified service claims. The review branch preserves its visual identity, anchor destinations and calculator. It replaces the misleading submission behavior and clarifies pilot scope, planned markets and integration availability.

## Configure an approved enquiry destination

Assign these values through Vercel environment settings for the intended Preview or Production scope. Keep tokens and secrets in Vercel, outside Git.

| Variable | Purpose |
| --- | --- |
| `LEAD_COLLECTOR_URL` | Approved HTTPS endpoint that stores the lead in a restricted CRM or equivalent intake system. |
| `LEAD_COLLECTOR_TOKEN` | Server-side bearer credential for the intake endpoint. |
| `LEAD_ALLOWED_ORIGINS` | Comma-separated exact HTTPS origins for the intended website or protected preview. |
| `TURNSTILE_SITE_KEY` | Public Cloudflare Turnstile widget key, restricted to the approved hostname. |
| `TURNSTILE_SECRET` | Server-side Turnstile verification secret. |
| `ENABLE_VERCEL_ANALYTICS` | Optional. Set to `1` only after enabling Vercel Web Analytics and approving the privacy disclosure. |

The intake endpoint receives JSON with `intent`, `company`, `contact`, `email`, `website`, `country`, `markets`, `category`, `orders`, `services`, `details`, `source`, `consent` and `consentAt`. It must return HTTP success and JSON `{"accepted":true}` only after durable acceptance. An integration expecting a different contract requires an approved adapter. The browser receives an availability flag and the public widget key. An unconfigured form stays disabled. When enabled, the conversion event fires after acceptance and sends only the enquiry type. Verify analytics delivery and privacy requirements before enabling it.

## Verify and launch

1. Run `npm test`. Start Vercel's local runtime for full routing or use a clean-URL static server for UI checks. Test an approved collector with synthetic data before enabling production lead intake. Verify receipt and outage behavior, including the case where a collector times out.
2. Open a protected, explicitly non-production Vercel preview from the review branch. Ensure it requires authentication before sharing. The review branch and `main` have automatic deployments disabled in the proposed config to preserve the approval gate.
3. Obtain approval for the legal entity and contact details, privacy contact route, retention timetable, processing basis and transfers, processor list, terms and applicable jurisdiction. Replace the drafts with approved copy. Confirm public contact information and the service scope, market references and pricing language with the owner.
4. After production approval, release the reviewed commit with the existing domain and rollback deployment recorded. Confirm the canonical redirect, crawl files, Open Graph image, security headers and one real destination receipt using approved synthetic data. Enable measurement only after privacy review.
