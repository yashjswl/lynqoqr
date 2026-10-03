import { useCallback, useState } from "react";
import { Link2, Plus } from "lucide-react";
import Create from "./pages/Create";
import Library from "./pages/Library";
import type { Entry } from "./lib/api";

type View = { name: "library" } | { name: "form"; entry: Entry | null };

export default function App() {
  const [view, setView] = useState<View>(() => (location.hash === "#/new" ? { name: "form", entry: null } : { name: "library" }));
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);

  const notify = useCallback((msg: string) => {
    const id = Date.now();
    setToast({ msg, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => setView({ name: "library" })} aria-label="LynqoQR, go to links">
            <span className="brand-mark"><Link2 size={16} strokeWidth={2.25} /></span>LynqoQR
          </button>
          {view.name === "library" && (
            <button className="btn primary" onClick={() => setView({ name: "form", entry: null })}>
              <Plus size={16} /> New link
            </button>
          )}
        </div>
      </header>
      <div className="page">
        {view.name === "library" ? (
          <Library onEdit={(entry) => setView({ name: "form", entry })} onNew={() => setView({ name: "form", entry: null })} notify={notify} />
        ) : (
          <Create
            key={view.entry?.id ?? "new"}
            editing={view.entry}
            onDone={(msg) => { if (msg) notify(msg); setView({ name: "library" }); }}
            notify={notify}
          />
        )}
      </div>
      <footer className="footer">© 2026 Yashasvi Jaiswal</footer>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className="toast" key={toast.id}>{toast.msg}</div>}
      </div>
    </>
  );
}
