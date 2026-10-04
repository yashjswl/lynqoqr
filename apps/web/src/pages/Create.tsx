import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download, ImagePlus, Loader2, MessageCircle, X } from "lucide-react";
import { api, type Domain, type Entry } from "../lib/api";
import { defaultQr, makeQr } from "../lib/qr";
import { download, qrFile, shareToWhatsApp } from "../lib/share";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const validUrl = (s: string) => { try { return /^https?:$/.test(new URL(s).protocol); } catch { return false; } };

export default function Create({ editing, onDone, notify }: { editing: Entry | null; onDone: (msg?: string) => void; notify: (m: string) => void }) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [targetUrl, setTargetUrl] = useState(editing?.targetUrl ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [logo, setLogo] = useState<string | null>(editing?.logo ?? null);
  const [opts, setOpts] = useState({ ...defaultQr, ...editing?.qrOptions });
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainId, setDomainId] = useState(editing?.domain ?? "");
  const base = domains.find((d) => d.id === domainId)?.base ?? (editing ? editing.shortUrl.slice(0, -editing.slug.length) : "");
  const [avail, setAvail] = useState<"idle" | "checking" | "yes" | "no">("idle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const uploaded = useRef(false);
  const logoTouched = useRef(false);
  const preview = useRef<HTMLDivElement>(null);

  // New links start with the last uploaded logo; the user can still replace or remove it for this QR.
  useEffect(() => {
    if (editing) return;
    api.settings().then((s) => { if (s.defaultLogo && !logoTouched.current) setLogo(s.defaultLogo); }).catch(() => {});
  }, [editing]);
  useEffect(() => {
    api.config().then((c) => {
      setDomains(c.domains);
      if (editing) return;
      const last = localStorage.getItem("lynqoqr:domain");
      setDomainId(c.domains.find((d) => d.id === last)?.id ?? c.domains[0]?.id ?? "");
    }).catch(() => {});
  }, [editing]);
  useEffect(() => { if (!slugTouched) setSlug(slugify(title)); }, [title, slugTouched]);

  useEffect(() => {
    if (!domainId || slug.length < 3 || (slug === editing?.slug && domainId === editing?.domain)) { setAvail("idle"); return; }
    setAvail("checking");
    const t = setTimeout(() => api.slugAvailable(slug, domainId).then((r) => setAvail(r.available ? "yes" : "no")).catch(() => setAvail("idle")), 350);
    return () => clearTimeout(t);
  }, [slug, domainId, editing]);

  const shortUrl = `${base}${slug || "your-link"}`;

  useEffect(() => {
    const el = preview.current;
    if (!el) return;
    el.innerHTML = "";
    makeQr(shortUrl, logo, opts, 512).append(el);
    el.querySelector("canvas")?.setAttribute("style", "width:100%;height:auto;display:block");
  }, [shortUrl, logo, opts]);

  function onLogo(f?: File) {
    if (!f) return;
    if (f.size > 300_000) { setErr("Logo is too large. Use an image under 300 KB."); return; }
    setErr("");
    const r = new FileReader();
    r.onload = () => { uploaded.current = true; logoTouched.current = true; setLogo(String(r.result)); };
    r.readAsDataURL(f);
  }

  const urlOk = !targetUrl || validUrl(targetUrl);
  const ready = title.trim() && validUrl(targetUrl) && slug.length >= 3 && avail !== "no" && avail !== "checking";

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const body = { title, targetUrl, slug, qrOptions: opts, logo, ...(editing ? {} : { domain: domainId }) };
      if (editing) await api.update(editing.id, body);
      else { await api.create(body); try { localStorage.setItem("lynqoqr:domain", domainId); } catch {} }
      if (uploaded.current && logo) await api.saveDefaultLogo(logo).catch(() => {});
      onDone(editing ? "Changes saved" : "Link created");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <button className="back" onClick={() => onDone()}><ArrowLeft size={16} /> Links</button>
      <div className="page-head"><h1>{editing ? "Edit link" : "New link"}</h1></div>

      <div className="create">
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) save(); }}>
          <section className="card">
            <div className="field">
              <label htmlFor="url">Destination URL</label>
              <input id="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value.trim())} placeholder="https://forms.gle/…" inputMode="url" autoComplete="off" aria-invalid={!urlOk} />
              {!urlOk && <p className="hint bad">Enter a full link starting with https://</p>}
            </div>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Annual meetup registration" maxLength={200} />
              <p className="hint">Used as the first line when you share on WhatsApp.</p>
            </div>
            {(domains.length > 1 || (editing && domains.length > 0)) && (
              <div className="field">
                <label htmlFor="domain">Domain</label>
                <select id="domain" value={domainId} disabled={!!editing} onChange={(e) => setDomainId(e.target.value)}>
                  {domains.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
                {editing && <p className="hint">A link's domain can't be changed after it's created.</p>}
              </div>
            )}
            <div className="field">
              <label htmlFor="slug">Short link</label>
              <div className="addon">
                <span className="addon-prefix">{base.replace(/^https?:\/\//, "") || "…"}</span>
                <input id="slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="your-link" autoComplete="off" spellCheck={false} />
                <span className="addon-status" aria-live="polite">
                  {avail === "checking" && <Loader2 size={16} className="spin" aria-label="Checking" />}
                  {avail === "yes" && <Check size={16} className="ok" aria-label="Available" />}
                  {avail === "no" && <X size={16} className="bad" aria-label="Taken" />}
                </span>
              </div>
              {avail === "no" && <p className="hint bad">That slug is already taken.</p>}
              {avail === "yes" && <p className="hint ok">Available.</p>}
            </div>
          </section>

          <section className="card">
            <h2>QR code</h2>
            <div className="field">
              <span className="label">Center logo</span>
              <div className="logo-row">
                {logo ? <img src={logo} alt="" className="logo-thumb" /> : <span className="logo-thumb blank"><ImagePlus size={18} /></span>}
                <label className="btn file">
                  {logo ? "Replace" : "Upload logo"}
                  <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} />
                </label>
                {logo && <button type="button" className="btn ghost" onClick={() => { logoTouched.current = true; setLogo(null); }}>Remove</button>}
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="fg">QR color</label>
                <div className="color"><input id="fg" type="color" value={opts.fg} onChange={(e) => setOpts({ ...opts, fg: e.target.value })} /><code>{opts.fg}</code></div>
              </div>
              <div className="field">
                <label htmlFor="bg">Background</label>
                <div className="color"><input id="bg" type="color" value={opts.bg} onChange={(e) => setOpts({ ...opts, bg: e.target.value })} /><code>{opts.bg}</code></div>
              </div>
            </div>
            {logo && (
              <div className="field">
                <label htmlFor="size">Logo size</label>
                <input id="size" type="range" min="0.1" max="0.3" step="0.01" value={opts.logoScale} onChange={(e) => setOpts({ ...opts, logoScale: +e.target.value })} />
              </div>
            )}
          </section>

          {err && <p className="alert" role="alert">{err}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => onDone()}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!ready || busy || !domainId}>
              {busy && <Loader2 size={16} className="spin" />}{editing ? "Save changes" : "Create link"}
            </button>
          </div>
        </form>

        <aside className="preview card">
          <div className="qr-frame" ref={preview} aria-label="QR code preview" />
          <p className="preview-title">{title || "Untitled link"}</p>
          <p className="preview-url">{shortUrl.replace(/^https?:\/\//, "")}</p>
          {editing ? (
            <div className="preview-actions">
              <button className="btn" onClick={async () => download(await qrFile(editing))}><Download size={16} /> Download PNG</button>
              <button className="btn" onClick={async () => notify(await shareToWhatsApp(editing))}><MessageCircle size={16} /> Share</button>
            </div>
          ) : (
            <p className="hint center">Create the link to download or share this QR.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
