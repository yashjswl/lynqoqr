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

**https://lynqoqr.yashjswl.com**

The deployment is private as it writes to personal short-link storage. **Please request access via LinkedIn/Github**.

## Features

- Create a short link with a custom slug and a live availability check.
- QR code with a center logo, custom colors and logo size. Error correction is set to high so it still scans.
- Your last uploaded logo is stored and used for the next QR until you upload a different one.
- Library with search, edit, delete, QR download and caption copy.
- WhatsApp share: on a phone it opens the share sheet with the QR image and the caption `Title`, newline, `Short Link: <url>`. On desktop it downloads the QR, copies the caption and opens WhatsApp.
- Accounts and roles: an administrator creates users and chooses which short domains each can use. Users only see their own links.
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

### Multiple short domains

Set `DOMAINS` in `wrangler.local.toml` (see the commented example in `apps/api/wrangler.toml`) to serve links from more than one domain. Each domain has its own KV namespace, so slugs never collide, and each link remembers its domain. `apps/redirect` is a ready-to-deploy redirect Worker for one domain.

## Stack

Vite + React + TypeScript, Hono on Cloudflare Workers (serving the built app as static assets), D1, Workers KV, [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling). Built-in accounts: email and password sign-in (PBKDF2 hashes, HTTP-only session cookies), an admin role that creates users and grants them access to specific short domains.

## Run your own

1. `npm install`
2. Create the resources: a KV namespace for the short links (the one your redirect Worker reads) and `npx wrangler d1 create lynqoqr`.
3. `cp apps/api/wrangler.toml apps/api/wrangler.local.toml` (gitignored) and fill in the KV namespace id, the D1 database id and `SHORT_BASE_URL` (the public domain that serves your short links, no trailing slash).
4. `npm run db:local` then `npm run dev:api` (serves the built app and API on http://localhost:8787; run `npm run build` first). `npm run dev:web` gives hot reload and proxies `/api`.
5. Deploy: `npm run db:remote -w apps/api`, then `npm run deploy`.
6. Set the admin password as a secret (it is only used to create the admin account on first sign-in): `cd apps/api && npx wrangler secret put ADMIN_PASSWORD -c wrangler.local.toml`, and set `ADMIN_EMAIL` in `wrangler.local.toml`. Then sign in with that email and password and add users from the Users page.

## Project layout

- `apps/web`: React app. `apps/api`: Worker, D1 migrations. `docs/`: screenshots and the redirect Worker.
- `PRODUCT.md` and `apps/web/DESIGN.md` record the product context and the design system.

## Contact

From [Yashasvi Jaiswal](https://yashjswl.com).

LinkedIn: [linkedin.com/in/yashjswl](https://www.linkedin.com/in/yashjswl/)

Email: [hello@yashjswl.com](mailto:hello@yashjswl.com)

---

&copy; 2026 Yashasvi Jaiswal.
