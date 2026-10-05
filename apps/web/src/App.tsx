import { useCallback, useEffect, useState } from "react";
import { KeyRound, Link2, LogOut, Plus, UserRound, Users as UsersIcon } from "lucide-react";
import Create from "./pages/Create";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Users from "./pages/Users";
import Menu from "./components/Menu";
import { api, type Entry, type User } from "./lib/api";

type View = { name: "library" } | { name: "form"; entry: Entry | null } | { name: "users" } | { name: "account" };

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = still checking the session
  const [view, setView] = useState<View>(() => (location.hash === "#/new" ? { name: "form", entry: null } : { name: "library" }));
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);

  const notify = useCallback((msg: string) => {
    const id = Date.now();
    setToast({ msg, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200);
  }, []);

  useEffect(() => {
    api.me().then((r) => setUser(r.user)).catch(() => setUser(null));
    const out = () => setUser(null);
    window.addEventListener("lq:unauthorized", out);
    return () => window.removeEventListener("lq:unauthorized", out);
  }, []);

  async function signOut() {
    await api.logout().catch(() => {});
    setUser(null);
    setView({ name: "library" });
  }

  if (user === undefined) return <div className="boot" aria-busy="true" />;
  if (user === null) return <Login onSignedIn={(u) => { setUser(u); setView({ name: "library" }); }} />;

  const go = (v: View) => setView(v);
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => go({ name: "library" })} aria-label="LynqoQR, go to links">
            <span className="brand-mark"><Link2 size={16} strokeWidth={2.25} /></span>LynqoQR
          </button>
          <div className="top-actions">
            {view.name === "library" && user.domains.length > 0 && (
              <button className="btn primary" onClick={() => go({ name: "form", entry: null })}>
                <Plus size={16} /> New link
              </button>
            )}
            <Menu
              label={`Account menu for ${user.email}`}
              icon={<UserRound size={18} />}
              items={[
                ...(user.role === "admin" ? [{ label: "Users", icon: <UsersIcon size={15} />, onSelect: () => go({ name: "users" }) }] : []),
                { label: "Change password", icon: <KeyRound size={15} />, onSelect: () => go({ name: "account" }) },
                { label: "Sign out", icon: <LogOut size={15} />, onSelect: signOut },
              ]}
            />
          </div>
        </div>
      </header>
      <div className="page">
        {view.name === "library" && (
          <Library me={user} onEdit={(entry) => go({ name: "form", entry })} onNew={() => go({ name: "form", entry: null })} notify={notify} />
        )}
        {view.name === "form" && (
          <Create
            key={view.entry?.id ?? "new"}
            editing={view.entry}
            onDone={(msg) => { if (msg) notify(msg); go({ name: "library" }); }}
            notify={notify}
          />
        )}
        {view.name === "users" && <Users me={user} notify={notify} />}
        {view.name === "account" && <Account user={user} onBack={() => go({ name: "library" })} notify={notify} />}
      </div>
      <footer className="footer">© 2026 Yashasvi Jaiswal</footer>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className="toast" key={toast.id}>{toast.msg}</div>}
      </div>
    </>
  );
}
