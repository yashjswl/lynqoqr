import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, type User } from "../lib/api";

export default function Account({ user, onBack, notify }: { user: User; onBack: () => void; notify: (m: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.changePassword(current, next);
      notify("Password changed. Other devices were signed out.");
      onBack();
    } catch (er) {
      setErr((er as Error).message);
      setBusy(false);
    }
  }

  return (
    <main>
      <button className="back" onClick={onBack}><ArrowLeft size={16} /> Links</button>
      <div className="page-head"><div><h1>Account</h1><p className="sub">{user.email} · {user.role === "admin" ? "Administrator" : "User"}</p></div></div>
      <form className="card narrow" onSubmit={submit}>
        <h2>Change password</h2>
        <div className="field">
          <label htmlFor="cur">Current password</label>
          <input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="new">New password</label>
          <input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} minLength={10} required />
          <p className="hint">At least 10 characters.</p>
        </div>
        {err && <p className="alert" role="alert">{err}</p>}
        <div className="form-actions">
          <button className="btn primary" type="submit" disabled={busy || next.length < 10 || !current}>
            {busy && <Loader2 size={16} className="spin" />}Change password
          </button>
        </div>
      </form>
    </main>
  );
}
