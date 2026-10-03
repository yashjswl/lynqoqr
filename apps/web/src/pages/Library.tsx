import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, Link2, MessageCircle, Pencil, Search, Trash2 } from "lucide-react";
import { api, type Entry } from "../lib/api";
import { caption, download, qrFile, shareToWhatsApp } from "../lib/share";
import QrThumb from "../components/QrThumb";
import Menu from "../components/Menu";
import ConfirmDialog from "../components/ConfirmDialog";

const fmt = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Library({ onEdit, onNew, notify }: { onEdit: (e: Entry) => void; onNew: () => void; notify: (m: string) => void }) {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Entry | null>(null);

  const load = () => api.list().then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (items ?? []).filter((i) => !n || `${i.title} ${i.slug} ${i.targetUrl}`.toLowerCase().includes(n));
  }, [items, q]);

  const copy = async (text: string, key: string, msg: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    notify(msg);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };

  async function confirmDelete() {
    const e = toDelete!;
    setToDelete(null);
    try {
      await api.remove(e.id);
      notify("Link deleted");
      load();
    } catch (er) {
      notify((er as Error).message);
    }
  }

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>Links</h1>
          {items && <p className="sub">{items.length} {items.length === 1 ? "link" : "links"}</p>}
        </div>
        <label className="search">
          <Search size={16} aria-hidden />
          <input type="search" placeholder="Search title, slug or URL" aria-label="Search links" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {err && <p className="alert" role="alert">{err}</p>}

      {items === null && !err && (
        <ul className="rows" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="row skeleton" />)}
        </ul>
      )}

      {items && items.length === 0 && (
        <div className="empty">
          <span className="empty-icon"><Link2 size={22} /></span>
          <h2>No links yet</h2>
          <p>Paste a form, event or booking link to get a short link and a QR code you can share.</p>
          <button className="btn primary" onClick={onNew}>Create your first link</button>
        </div>
      )}

      {items && items.length > 0 && shown.length === 0 && (
        <div className="empty"><h2>No matches</h2><p>Nothing matches “{q}”.</p><button className="btn" onClick={() => setQ("")}>Clear search</button></div>
      )}

      <ul className="rows">
        {shown.map((e) => (
          <li key={e.id} className="row">
            <QrThumb entry={e} />
            <div className="row-main">
              <h2 className="row-title">{e.title}</h2>
              <button className="chip" onClick={() => copy(e.shortUrl, e.id, "Short link copied")} aria-label={`Copy ${e.shortUrl}`}>
                <span>{e.shortUrl.replace(/^https?:\/\//, "")}</span>
                {copied === e.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <p className="row-dest" title={e.targetUrl}>
                <ExternalLink size={13} aria-hidden />{e.targetUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <time className="row-date" dateTime={e.createdAt}>{fmt(e.createdAt)}</time>
            <div className="row-actions">
              <button className="btn" aria-label={`Share ${e.title} on WhatsApp`} onClick={async () => notify(await shareToWhatsApp(e))}>
                <MessageCircle size={16} /> <span>Share</span>
              </button>
              <Menu
                label={`More actions for ${e.title}`}
                items={[
                  { label: "Edit", icon: <Pencil size={15} />, onSelect: () => onEdit(e) },
                  { label: "Download QR", icon: <Download size={15} />, onSelect: async () => download(await qrFile(e)) },
                  { label: "Copy caption", icon: <Copy size={15} />, onSelect: () => copy(caption(e), `c${e.id}`, "Caption copied") },
                  { label: "Delete", icon: <Trash2 size={15} />, danger: true, onSelect: () => setToDelete(e) },
                ]}
              />
            </div>
          </li>
        ))}
      </ul>

      {toDelete && (
        <ConfirmDialog
          title="Delete this link?"
          body={`“${toDelete.title}” and its short link ${toDelete.shortUrl.replace(/^https?:\/\//, "")} will stop working. Printed or shared QR codes will no longer lead anywhere.`}
          confirmLabel="Delete link"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </main>
  );
}
