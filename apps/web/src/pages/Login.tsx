import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { api, type User } from "../lib/api";

export default function Login({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      onSignedIn((await api.login(email, password)).user);
    } catch (er) {
      setErr((er as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
    <main className="login">
      <form className="card login-card" onSubmit={submit}>
        <span className="brand-mark big"><Link2 size={22} strokeWidth={2.25} /></span>
        <h1>Sign in to LynqoQR</h1>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="alert" role="alert">{err}</p>}
        <button className="btn primary" type="submit" disabled={busy || !email || !password}>
          {busy && <Loader2 size={16} className="spin" />}Sign in
        </button>
        <p className="hint center">
          Accounts are created by an administrator.
          <a className="contact" href="mailto:hello@yashjswl.com">Contact admin</a>
        </p>
      </form>
    </main>
    <footer className="footer login-footer">© 2026 Yashasvi Jaiswal</footer>
    </div>
  );
}
