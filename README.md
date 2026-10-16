# Angorfa Standards — TEST MODE

Mobile-first 20-question changeover inspection, with embedded MCN logo. Server-side shared-code gate and downloadable PDF report.

## Deploy on Netlify

Connect this repository to a new Netlify site. Publish directory `.`; functions directory `netlify/functions`.
Set environment variables in Netlify site configuration:
- `ACCESS_CODE` — private shared code (do NOT commit it to GitHub)
- `SESSION_SECRET` — random secret, at least 32 bytes (e.g. `openssl rand -hex 32`)

The frontend is inaccessible until the server accepts the access code. PDFs are generated server-side and downloaded to the user's device. No emails are sent, and no reports are stored by this application. Dave's address is intentionally **not** in the code.

## Important security and launch limitations

- This is a **test deployment**, not approved for public sharing with Dave's team.
- Email delivery is deliberately **not implemented**. Do not claim reports are emailed. After explicit approval, add a verified transactional email service with sender domain authentication, retries and delivery monitoring; keep a default-off email flag.
- The shared-code endpoint needs platform-level rate limiting / abuse protection before broad public use.
- Verify the PDF and mobile behavior end-to-end on a deployed site.
- A shared code is not equivalent to individual identity authentication.
- DNS: add a `standards` CNAME in GoDaddy using the exact target provided by Netlify. Do not change MX records.
