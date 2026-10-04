import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

type Env = {
  LINKS: KVNamespace;
  DB: D1Database;
  ASSETS: Fetcher;
  SHORT_BASE_URL?: string;
  DOMAINS?: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  [kvBinding: string]: unknown;
};

// A short-link domain: where its links are served from (base) and which KV namespace stores its slugs (kv binding name).
type Domain = { id: string; label: string; base: string; kv: string };

type Row = {
  id: string;
  title: string;
  target_url: string;
  slug: string;
  qr_options: string;
  logo: string | null;
  created_at: string;
  updated_at: string;
  domain: string;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const MAX_LOGO_CHARS = 400_000;

const app = new Hono<{ Bindings: Env }>();

// Cloudflare Access JWT check (skipped when not configured, i.e. local dev).
app.use("/api/*", async (c, next) => {
  const { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: aud } = c.env;
  if (!team || !aud) return next();
  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) return c.json({ error: "unauthorized" }, 401);
  try {
    const jwks = createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
    await jwtVerify(token, jwks, { issuer: team, audience: aud });
  } catch {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

// DOMAINS is a JSON array of {id, label?, base, kv}. Without it, SHORT_BASE_URL gives a single domain stored in LINKS.
function getDomains(env: Env): Domain[] {
  if (env.DOMAINS) {
    const list = JSON.parse(env.DOMAINS) as Partial<Domain>[];
    return list.map((d) => ({
      id: d.id!,
      base: d.base!.replace(/\/$/, ""),
      kv: d.kv ?? "LINKS",
      label: d.label ?? d.base!.replace(/^https?:\/\//, ""),
    }));
  }
  const base = (env.SHORT_BASE_URL ?? "").replace(/\/$/, "");
  return [{ id: "primary", label: base.replace(/^https?:\/\//, ""), base, kv: "LINKS" }];
}

const findDomain = (env: Env, id: string | undefined | null) => {
  const all = getDomains(env);
  return id ? all.find((d) => d.id === id) : all[0];
};
const kvFor = (env: Env, d: Domain) => env[d.kv] as KVNamespace;

const shape = (env: Env, r: Row) => ({
  id: r.id,
  title: r.title,
  targetUrl: r.target_url,
  slug: r.slug,
  domain: r.domain,
  shortUrl: `${findDomain(env, r.domain)?.base ?? ""}/${r.slug}`,
  qrOptions: JSON.parse(r.qr_options || "{}"),
  logo: r.logo,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

type Input = {
  title?: unknown;
  targetUrl?: unknown;
  slug?: unknown;
  qrOptions?: unknown;
  logo?: unknown;
};

function validate(body: Input, partial: boolean) {
  const out: { title?: string; targetUrl?: string; slug?: string; qrOptions?: string; logo?: string | null } = {};
  if (!partial || body.title !== undefined) {
    const t = typeof body.title === "string" ? body.title.trim() : "";
    if (!t || t.length > 200) return { error: "title is required (max 200 chars)" };
    out.title = t;
  }
  if (!partial || body.targetUrl !== undefined) {
    try {
      const u = new URL(String(body.targetUrl));
      if (u.protocol !== "http:" && u.protocol !== "https:") throw 0;
      out.targetUrl = u.toString();
    } catch {
      return { error: "targetUrl must be a valid http(s) URL" };
    }
  }
  if (!partial || body.slug !== undefined) {
    const s = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!SLUG_RE.test(s)) return { error: "slug must be 3-40 chars: a-z, 0-9, hyphen" };
    out.slug = s;
  }
  if (body.qrOptions !== undefined) out.qrOptions = JSON.stringify(body.qrOptions ?? {});
  if (body.logo !== undefined) {
    if (body.logo === null) out.logo = null;
    else if (typeof body.logo === "string" && body.logo.startsWith("data:image/") && body.logo.length <= MAX_LOGO_CHARS)
      out.logo = body.logo;
    else return { error: "logo must be an image data URL under ~300KB" };
  }
  return { value: out };
}

app.get("/api/config", (c) =>
  c.json({ domains: getDomains(c.env).map((d) => ({ id: d.id, label: d.label, base: d.base + "/" })) }),
);

app.get("/api/settings", async (c) => {
  const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'default_logo'").first<{ value: string }>();
  return c.json({ defaultLogo: row?.value ?? null });
});

app.put("/api/settings/default-logo", async (c) => {
  const { logo } = await c.req.json<{ logo?: unknown }>().catch(() => ({ logo: undefined }));
  if (typeof logo !== "string" || !logo.startsWith("data:image/") || logo.length > MAX_LOGO_CHARS)
    return c.json({ error: "logo must be an image data URL under ~300KB" }, 400);
  await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES ('default_logo', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(logo)
    .run();
  return c.json({ defaultLogo: logo });
});

app.get("/api/entries", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM entries ORDER BY created_at DESC").all<Row>();
  return c.json(results.map((r) => shape(c.env, r)));
});

app.get("/api/slug/:slug/available", async (c) => {
  const slug = c.req.param("slug").toLowerCase();
  const domain = findDomain(c.env, c.req.query("domain"));
  if (!domain) return c.json({ error: "unknown domain" }, 400);
  if (!SLUG_RE.test(slug)) return c.json({ available: false, reason: "invalid" });
  const taken = await kvFor(c.env, domain).get(slug);
  return c.json({ available: taken === null });
});

app.post("/api/entries", async (c) => {
  const body = await c.req.json<Input & { domain?: unknown }>().catch(() => ({}) as Input & { domain?: unknown });
  const { value: v, error } = validate(body, false);
  if (!v) return c.json({ error }, 400);
  const domain = findDomain(c.env, typeof body.domain === "string" ? body.domain : undefined);
  if (!domain) return c.json({ error: "unknown domain" }, 400);
  const kv = kvFor(c.env, domain);
  if ((await kv.get(v.slug!)) !== null) return c.json({ error: "slug already in use" }, 409);

  const id = crypto.randomUUID();
  await kv.put(v.slug!, v.targetUrl!);
  try {
    await c.env.DB.prepare(
      "INSERT INTO entries (id, title, target_url, slug, qr_options, logo, domain) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, v.title, v.targetUrl, v.slug, v.qrOptions ?? "{}", v.logo ?? null, domain.id)
      .run();
  } catch (e) {
    await kv.delete(v.slug!); // roll back
    return c.json({ error: "failed to save entry" }, 500);
  }
  const row = await c.env.DB.prepare("SELECT * FROM entries WHERE id = ?").bind(id).first<Row>();
  return c.json(shape(c.env, row!), 201);
});

app.patch("/api/entries/:id", async (c) => {
  const id = c.req.param("id");
  const cur = await c.env.DB.prepare("SELECT * FROM entries WHERE id = ?").bind(id).first<Row>();
  if (!cur) return c.json({ error: "not found" }, 404);
  const { value: v, error } = validate(await c.req.json<Input>().catch(() => ({})), true);
  if (!v) return c.json({ error }, 400);

  const domain = findDomain(c.env, cur.domain);
  if (!domain) return c.json({ error: "this link's domain is no longer configured" }, 400);
  const kv = kvFor(c.env, domain);
  const slug = v.slug ?? cur.slug;
  const target = v.targetUrl ?? cur.target_url;
  const slugChanged = slug !== cur.slug;
  if (slugChanged && (await kv.get(slug)) !== null) return c.json({ error: "slug already in use" }, 409);

  await kv.put(slug, target);
  try {
    await c.env.DB.prepare(
      "UPDATE entries SET title=?, target_url=?, slug=?, qr_options=?, logo=?, updated_at=datetime('now') WHERE id=?",
    )
      .bind(
        v.title ?? cur.title,
        target,
        slug,
        v.qrOptions ?? cur.qr_options,
        v.logo !== undefined ? v.logo : cur.logo,
        id,
      )
      .run();
  } catch {
    if (slugChanged) await kv.delete(slug);
    else await kv.put(cur.slug, cur.target_url);
    return c.json({ error: "failed to update entry" }, 500);
  }
  if (slugChanged) await kv.delete(cur.slug);
  const row = await c.env.DB.prepare("SELECT * FROM entries WHERE id = ?").bind(id).first<Row>();
  return c.json(shape(c.env, row!));
});

app.delete("/api/entries/:id", async (c) => {
  const id = c.req.param("id");
  const cur = await c.env.DB.prepare("SELECT slug, domain FROM entries WHERE id = ?").bind(id).first<{ slug: string; domain: string }>();
  if (!cur) return c.json({ error: "not found" }, 404);
  const domain = findDomain(c.env, cur.domain);
  if (!domain) return c.json({ error: "this link's domain is no longer configured" }, 400);
  await kvFor(c.env, domain).delete(cur.slug);
  await c.env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
