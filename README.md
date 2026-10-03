# LynqoQR

Turn a promo link (Google Form, event page, booking page) into a **short link** and a **QR code with your logo in the center**, keep every one in a library, and **share the QR to WhatsApp** in one tap.

<table>
  <tr>
    <th align="center">Links (desktop)</th>
    <th align="center">New link (desktop)</th>
  </tr>
  <tr>
    <td><img src="docs/screenshots/library-desktop.png" alt="Links page on desktop"></td>
    <td><img src="docs/screenshots/create.jpg" alt="New link page on desktop"></td>
  </tr>
  <tr>
    <th align="center">Links (mobile)</th>
    <th align="center">New link (mobile)</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/library-mobile.jpg" alt="Links page on a phone" width="240"></td>
    <td align="center"><img src="docs/screenshots/create-mobile.jpg" alt="New link page on a phone" width="240"></td>
  </tr>
</table>

## Live deployment

**https://lynqoqr.yashasvi-jaiswal-2006.workers.dev**

The deployment is private as it writes to personal short-link storage. **Please request access via LinkedIn/Github**.

## Features

- Create a short link with a custom slug and a live availability check.
- QR code with a center logo, custom colors and logo size. Error correction is set to high so it still scans.
- Your last uploaded logo is stored and used for the next QR until you upload a different one.
- Library with search, edit, delete, QR download and caption copy.
- WhatsApp share: on a phone it opens the share sheet with the QR image and the caption `Title`, newline, `Short Link: <url>`. On desktop it downloads the QR, copies the caption and opens WhatsApp.
- Light and dark themes, mobile-first.

## How it works

```
Browser ──► LynqoQR Worker (React app + Hono API)
              ├─ KV  link-short : slug -> long URL      (the short links)
              └─ D1  entries    : title, QR options, logo, timestamps
Visitor ──► Redirect Worker on your short domain ──reads── KV link-short ──► 302 to the long URL
```

LynqoQR never serves redirects itself. It writes `slug -> URL` pairs into a Workers KV namespace, and a small separate Worker on your short domain reads that namespace and redirects. That Worker is in [`docs/redirect-worker.js`](docs/redirect-worker.js):

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const shortname = url.pathname.slice(1).toLowerCase();
    if (!shortname) return fetch(request);           // domain root: normal website
    try {
      const value = await env.redirects.get(shortname);
      if (value === null) return fetch(request);     // unknown key: normal website
      return Response.redirect(value, 302);
    } catch (err) {
      return fetch(request);
    }
  }
};
```

Slugs are lowercased by both sides, so a short link works whatever case you type it in.

## Stack

Vite + React + TypeScript, Hono on Cloudflare Workers (serving the built app as static assets), D1, Workers KV, [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling). Access control via Cloudflare Access; the API also verifies the Access JWT when configured.

## Run your own

1. `npm install`
2. Create the resources: a KV namespace for the short links (the one your redirect Worker reads) and `npx wrangler d1 create lynqoqr`.
3. `cp apps/api/wrangler.toml apps/api/wrangler.local.toml` (gitignored) and fill in the KV namespace id, the D1 database id and `SHORT_BASE_URL` (the public domain that serves your short links, no trailing slash).
4. `npm run db:local` then `npm run dev:api` (serves the built app and API on http://localhost:8787; run `npm run build` first). `npm run dev:web` gives hot reload and proxies `/api`.
5. Deploy: `npm run db:remote -w apps/api`, then `npm run deploy`.
6. Put the Worker's domain behind Cloudflare Access and set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.local.toml` so the API verifies the login token.

## Project layout

- `apps/web`: React app. `apps/api`: Worker, D1 migrations. `docs/`: screenshots and the redirect Worker.
- `PRODUCT.md` and `apps/web/DESIGN.md` record the product context and the design system.

## Contact

From Yashasvi Jaiswal.

LinkedIn: [linkedin.com/in/yashjswl](https://www.linkedin.com/in/yashjswl/)

---

&copy; 2026 Yashasvi Jaiswal.
