import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { DUMMY_HASH, hashPassword, newToken, sha256Hex, verifyPassword } from "./auth";

type Env = {
  LINKS: KVNamespace;
  DB: D1Database;
  ASSETS: Fetcher;
  SHORT_BASE_URL?: string;
  DOMAINS?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string; // secret; only used to create the admin account the first time
  [kvBinding: string]: unknown;
};

// A short-link domain: where its links are served from (base) and which KV namespace stores its slugs (kv binding name).
type Domain = { id: string; label: string; base: string; kv: string };

type User = { id: string; email: string; role: "admin" | "user"; disabled: number };
type Vars = { user: User; allowed: string[] };
type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

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
  owner_id: string | null;
  owner_email?: string | null;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGO_CHARS = 400_000;
const SESSION_SECONDS = 30 * 24 * 3600;
const MAX_FAILS = 5;
const LOCK_SECONDS = 5 * 60;
const MIN_PASSWORD = 10;

const app = new Hono<{ Bindings: Env; Variables: Vars }>();
const now = () => Math.floor(Date.now() / 1000);

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
  c.header("Content-Security-Policy", "frame-ancestors 'none'");
});

// ---- domains --------------------------------------------------------------------------------------------------

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

const kvFor = (env: Env, d: Domain) => env[d.kv] as KVNamespace;

// ---- accounts -------------------------------------------------------------------------------------------------

// Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD the first time, and adopts existing links.
async function seedAdmin(env: Env) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !env.ADMIN_PASSWORD) return;
  const exists = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
  if (exists) return;
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'admin')").bind(id, email, await hashPassword(env.ADMIN_PASSWORD)),
    env.DB.prepare("UPDATE entries SET owner_id = ? WHERE owner_id IS NULL").bind(id),
  ]);
}

async function allowedDomains(env: Env, u: User) {
  const all = getDomains(env).map((d) => d.id);
  if (u.role === "admin") return all;
  const { results } = await env.DB.prepare("SELECT domain_id FROM user_domains WHERE user_id = ?").bind(u.id).all<{ domain_id: string }>();
  const granted = new Set(results.map((r) => r.domain_id));
  return all.filter((id) => granted.has(id));
}

async function startSession(c: Ctx, userId: string) {
  const token = newToken();
  await c.env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256Hex(token), userId, now() + SESSION_SECONDS)
    .run();
  setCookie(c, "lq_session", token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

// Reject cross-site writes (SameSite=Lax already blocks most; this also covers odd clients).
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("Origin");
    if (origin && new URL(origin).host !== new URL(c.req.url).host) return c.json({ error: "forbidden" }, 403);
  }
  return next();
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json<{ email?: unknown; password?: unknown }>().catch(() => ({}) as { email?: unknown; password?: unknown });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const bad = () => c.json({ error: "Incorrect email or password." }, 401);
  if (!email || !password || password.length > 200) return bad();

  await seedAdmin(c.env);
  await c.env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now()).run();
  const row = await c.env.DB.prepare("SELECT id, email, role, disabled, password_hash, failed_count, locked_until FROM users WHERE email = ?")
    .bind(email)
    .first<User & { password_hash: string; failed_count: number; locked_until: number }>();

  if (!row) {
    await verifyPassword(password, DUMMY_HASH).catch(() => false);
    return bad();
  }
  if (row.locked_until > now()) return c.json({ error: "Too many attempts. Try again in a few minutes." }, 429);

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok || row.disabled) {
    const fails = row.failed_count + 1;
    await c.env.DB.prepare("UPDATE users SET failed_count = ?, locked_until = ? WHERE id = ?")
      .bind(fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? now() + LOCK_SECONDS : 0, row.id)
      .run();
    return bad();
  }
  await c.env.DB.prepare("UPDATE users SET failed_count = 0, locked_until = 0 WHERE id = ?").bind(row.id).run();
  await startSession(c, row.id);
  return c.json({ user: { id: row.id, email: row.email, role: row.role, domains: await allowedDomains(c.env, row) } });
});

app.post("/api/auth/logout", async (c) => {
  const token = getCookie(c, "lq_session");
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  deleteCookie(c, "lq_session", { path: "/" });
  return c.body(null, 204);
});

// Everything below requires a signed-in, enabled user.
app.use("/api/*", async (c, next) => {
  const token = getCookie(c, "lq_session");
  if (!token) return c.json({ error: "unauthorized" }, 401);
  const u = await c.env.DB.prepare(
    "SELECT u.id, u.email, u.role, u.disabled FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
  )
    .bind(await sha256Hex(token), now())
    .first<User>();
  if (!u || u.disabled) return c.json({ error: "unauthorized" }, 401);
  c.set("user", u);
  c.set("allowed", await allowedDomains(c.env, u));
  return next();
});

app.get("/api/auth/me", (c) => {
  const u = c.get("user");
  return c.json({ user: { id: u.id, email: u.email, role: u.role, domains: c.get("allowed") } });
});

app.post("/api/auth/password", async (c) => {
  const u = c.get("user");
  const { current, next } = await c.req.json<{ current?: unknown; next?: unknown }>().catch(() => ({}) as { current?: unknown; next?: unknown });
  if (typeof current !== "string" || typeof next !== "string") return c.json({ error: "Current and new password are required." }, 400);
  if (next.length < MIN_PASSWORD || next.length > 200) return c.json({ error: `New password must be at least ${MIN_PASSWORD} characters.` }, 400);
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(u.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash))) return c.json({ error: "Current password is incorrect." }, 400);
  const keep = await sha256Hex(getCookie(c, "lq_session") ?? "");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(next), u.id),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(u.id, keep), // sign out other devices
  ]);
  return c.body(null, 204);
});

// ---- admin ----------------------------------------------------------------------------------------------------

app.use("/api/admin/*", async (c, next) => (c.get("user").role === "admin" ? next() : c.json({ error: "forbidden" }, 403)));

async function listUsers(env: Env) {
  const { results: users } = await env.DB.prepare("SELECT id, email, role, disabled, created_at FROM users ORDER BY created_at").all<{
    id: string; email: string; role: string; disabled: number; created_at: string;
  }>();
  const { results: grants } = await env.DB.prepare("SELECT user_id, domain_id FROM user_domains").all<{ user_id: string; domain_id: string }>();
  const all = getDomains(env).map((d) => d.id);
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    disabled: !!u.disabled,
    createdAt: u.created_at,
    domains: u.role === "admin" ? all : grants.filter((g) => g.user_id === u.id).map((g) => g.domain_id),
  }));
}

const cleanDomains = (env: Env, v: unknown) => {
  const valid = new Set(getDomains(env).map((d) => d.id));
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && valid.has(x)))] : [];
};

app.get("/api/admin/users", async (c) => c.json(await listUsers(c.env)));

app.post("/api/admin/users", async (c) => {
  const b = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return c.json({ error: "Enter a valid email address." }, 400);
  if (typeof b.password !== "string" || b.password.length < MIN_PASSWORD || b.password.length > 200)
    return c.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400);
  const role = b.role === "admin" ? "admin" : "user";
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first()) return c.json({ error: "A user with that email already exists." }, 409);
  const id = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)").bind(id, email, await hashPassword(b.password), role),
    ...cleanDomains(c.env, b.domains).map((d) => c.env.DB.prepare("INSERT INTO user_domains (user_id, domain_id) VALUES (?, ?)").bind(id, d)),
  ]);
  return c.json((await listUsers(c.env)).find((u) => u.id === id), 201);
});

app.patch("/api/admin/users/:id", async (c) => {
  const me = c.get("user");
  const id = c.req.param("id");
  if (!(await c.env.DB.prepare("SELECT 1 FROM users WHERE id = ?").bind(id).first())) return c.json({ error: "not found" }, 404);
  const b = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const stmts: D1PreparedStatement[] = [];

  if (id === me.id && (b.disabled === true || (b.role !== undefined && b.role !== "admin")))
    return c.json({ error: "You can't disable or demote your own account." }, 400);
  if (b.domains !== undefined) {
    stmts.push(c.env.DB.prepare("DELETE FROM user_domains WHERE user_id = ?").bind(id));
    for (const d of cleanDomains(c.env, b.domains)) stmts.push(c.env.DB.prepare("INSERT INTO user_domains (user_id, domain_id) VALUES (?, ?)").bind(id, d));
  }
  if (b.role !== undefined) stmts.push(c.env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(b.role === "admin" ? "admin" : "user", id));
  if (b.disabled !== undefined) {
    stmts.push(c.env.DB.prepare("UPDATE users SET disabled = ? WHERE id = ?").bind(b.disabled ? 1 : 0, id));
    if (b.disabled) stmts.push(c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
  }
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || b.password.length < MIN_PASSWORD || b.password.length > 200)
      return c.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400);
    stmts.push(c.env.DB.prepare("UPDATE users SET password_hash = ?, failed_count = 0, locked_until = 0 WHERE id = ?").bind(await hashPassword(b.password), id));
    stmts.push(c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json((await listUsers(c.env)).find((u) => u.id === id));
});

// ---- links ----------------------------------------------------------------------------------------------------

const shape = (env: Env, r: Row) => ({
  id: r.id,
  title: r.title,
  targetUrl: r.target_url,
  slug: r.slug,
  domain: r.domain,
  shortUrl: `${getDomains(env).find((d) => d.id === r.domain)?.base ?? ""}/${r.slug}`,
  qrOptions: JSON.parse(r.qr_options || "{}"),
  logo: r.logo,
  ownerEmail: r.owner_email ?? null,
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

app.get("/api/config", (c) => {
  const allowed = new Set(c.get("allowed"));
  return c.json({ domains: getDomains(c.env).filter((d) => allowed.has(d.id)).map((d) => ({ id: d.id, label: d.label, base: d.base + "/" })) });
});

// Default logo is per user (the admin also inherits the one saved before accounts existed).
app.get("/api/settings", async (c) => {
  const u = c.get("user");
  const keys = u.role === "admin" ? [`default_logo:${u.id}`, "default_logo"] : [`default_logo:${u.id}`];
  for (const k of keys) {
    const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(k).first<{ value: string }>();
    if (row) return c.json({ defaultLogo: row.value });
  }
  return c.json({ defaultLogo: null });
});

app.put("/api/settings/default-logo", async (c) => {
  const { logo } = await c.req.json<{ logo?: unknown }>().catch(() => ({ logo: undefined }));
  if (typeof logo !== "string" || !logo.startsWith("data:image/") || logo.length > MAX_LOGO_CHARS)
    return c.json({ error: "logo must be an image data URL under ~300KB" }, 400);
  await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(`default_logo:${c.get("user").id}`, logo)
    .run();
  return c.json({ defaultLogo: logo });
});

const SELECT_ENTRY = "SELECT e.*, u.email AS owner_email FROM entries e LEFT JOIN users u ON u.id = e.owner_id";

app.get("/api/entries", async (c) => {
  const u = c.get("user");
  const stmt =
    u.role === "admin"
      ? c.env.DB.prepare(`${SELECT_ENTRY} ORDER BY e.created_at DESC`)
      : c.env.DB.prepare(`${SELECT_ENTRY} WHERE e.owner_id = ? ORDER BY e.created_at DESC`).bind(u.id);
  const { results } = await stmt.all<Row>();
  return c.json(results.map((r) => shape(c.env, r)));
});

app.get("/api/slug/:slug/available", async (c) => {
  const slug = c.req.param("slug").toLowerCase();
  const domain = getDomains(c.env).find((d) => d.id === (c.req.query("domain") ?? getDomains(c.env)[0]?.id));
  if (!domain || !c.get("allowed").includes(domain.id)) return c.json({ error: "unknown domain" }, 400);
  if (!SLUG_RE.test(slug)) return c.json({ available: false, reason: "invalid" });
  const taken = await kvFor(c.env, domain).get(slug);
  return c.json({ available: taken === null });
});

app.post("/api/entries", async (c) => {
  const u = c.get("user");
  const body = await c.req.json<Input & { domain?: unknown }>().catch(() => ({}) as Input & { domain?: unknown });
  const { value: v, error } = validate(body, false);
  if (!v) return c.json({ error }, 400);
  const domain = getDomains(c.env).find((d) => d.id === (typeof body.domain === "string" ? body.domain : c.get("allowed")[0]));
  if (!domain || !c.get("allowed").includes(domain.id)) return c.json({ error: "You don't have access to that domain." }, 403);
  const kv = kvFor(c.env, domain);
  if ((await kv.get(v.slug!)) !== null) return c.json({ error: "slug already in use" }, 409);

  const id = crypto.randomUUID();
  await kv.put(v.slug!, v.targetUrl!);
  try {
    await c.env.DB.prepare(
      "INSERT INTO entries (id, title, target_url, slug, qr_options, logo, domain, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, v.title, v.targetUrl, v.slug, v.qrOptions ?? "{}", v.logo ?? null, domain.id, u.id)
      .run();
  } catch {
    await kv.delete(v.slug!); // roll back
    return c.json({ error: "failed to save entry" }, 500);
  }
  const row = await c.env.DB.prepare(`${SELECT_ENTRY} WHERE e.id = ?`).bind(id).first<Row>();
  return c.json(shape(c.env, row!), 201);
});

// Loads an entry the caller may change: their own (or any, for admins), on a domain they still have.
async function loadEditable(c: Ctx): Promise<{ cur: Row; domain: Domain } | { res: Response }> {
  const u = c.get("user");
  const cur = await c.env.DB.prepare("SELECT * FROM entries WHERE id = ?").bind(c.req.param("id")!).first<Row>();
  if (!cur || (u.role !== "admin" && cur.owner_id !== u.id)) return { res: c.json({ error: "not found" }, 404) };
  const domain = getDomains(c.env).find((d) => d.id === cur.domain);
  if (!domain || !c.get("allowed").includes(domain.id)) return { res: c.json({ error: "You don't have access to this link's domain." }, 403) };
  return { cur, domain };
}

app.patch("/api/entries/:id", async (c) => {
  const loaded = await loadEditable(c);
  if ("res" in loaded) return loaded.res;
  const { cur, domain } = loaded;
  const { value: v, error } = validate(await c.req.json<Input>().catch(() => ({})), true);
  if (!v) return c.json({ error }, 400);

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
      .bind(v.title ?? cur.title, target, slug, v.qrOptions ?? cur.qr_options, v.logo !== undefined ? v.logo : cur.logo, cur.id)
      .run();
  } catch {
    if (slugChanged) await kv.delete(slug);
    else await kv.put(cur.slug, cur.target_url);
    return c.json({ error: "failed to update entry" }, 500);
  }
  if (slugChanged) await kv.delete(cur.slug);
  const row = await c.env.DB.prepare(`${SELECT_ENTRY} WHERE e.id = ?`).bind(cur.id).first<Row>();
  return c.json(shape(c.env, row!));
});

app.delete("/api/entries/:id", async (c) => {
  const loaded = await loadEditable(c);
  if ("res" in loaded) return loaded.res;
  const { cur, domain } = loaded;
  await kvFor(c.env, domain).delete(cur.slug);
  await c.env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(cur.id).run();
  return c.body(null, 204);
});

app.all("/api/*", (c) => c.json({ error: "not found" }, 404));
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
