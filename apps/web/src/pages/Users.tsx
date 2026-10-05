import { useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { api, type AdminUser, type Domain, type User } from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";

const generate = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => chars[b % chars.length]).join("");
};

function DomainChecks({ domains, value, onChange, disabled }: { domains: Domain[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="checks">
      {domains.map((d) => (
        <label key={d.id} className="check">
          <input type="checkbox" disabled={disabled} checked={value.includes(d.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, d.id] : value.filter((x) => x !== d.id))} />
          {d.label}
        </label>
      ))}
    </div>
  );
}

export default function Users({ me, notify }: { me: User; notify: (m: string) => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [toDisable, setToDisable] = useState<AdminUser | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generate);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [grant, setGrant] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [newPw, setNewPw] = useState("");

  const load = () => api.users().then(setUsers).catch((e) => setErr(e.message));
  useEffect(() => { load(); api.config().then((c) => setDomains(c.domains)).catch(() => {}); }, []);

  const patch = async (id: string, body: Parameters<typeof api.updateUser>[1], msg: string) => {
    try {
      const u = await api.updateUser(id, body);
      setUsers((list) => (list ?? []).map((x) => (x.id === id ? u : x)));
      notify(msg);
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const u = await api.createUser({ email, password, role, domains: grant });
      setUsers((l) => [...(l ?? []), u]);
      try { await navigator.clipboard.writeText(`${u.email}\n${password}`); notify("User created. Email and password copied."); } catch { notify("User created."); }
      setAdding(false); setEmail(""); setPassword(generate()); setRole("user"); setGrant([]);
    } catch (er) {
      setErr((er as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="page-head">
        <div><h1>Users</h1><p className="sub">Create accounts and choose which domains each person can use.</p></div>
        {!adding && <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Add user</button>}
      </div>

      {adding && (
        <form className="card stack-form" onSubmit={create}>
          <h2>New user</h2>
          <div className="grid2">
            <div className="field">
              <label htmlFor="ne">Email</label>
              <input id="ne" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="np">Temporary password</label>
              <div className="inline">
                <input id="np" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required spellCheck={false} autoComplete="off" />
                <button type="button" className="btn" onClick={() => setPassword(generate())}>Generate</button>
              </div>
              <p className="hint">Share it with them; they can change it after signing in.</p>
            </div>
          </div>
          <div className="field">
            <span className="label">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")} aria-label="Role">
              <option value="user">User</option>
              <option value="admin">Administrator (all domains, manages users)</option>
            </select>
          </div>
          {role === "user" && (
            <div className="field">
              <span className="label">Domains</span>
              <DomainChecks domains={domains} value={grant} onChange={setGrant} />
              {grant.length === 0 && <p className="hint">Without a domain they can sign in but can't create links.</p>}
            </div>
          )}
          {err && <p className="alert" role="alert">{err}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
            <button className="btn primary" type="submit" disabled={busy || !email || password.length < 10}>
              {busy && <Loader2 size={16} className="spin" />}Create user
            </button>
          </div>
        </form>
      )}

      {err && !adding && <p className="alert" role="alert">{err}</p>}
      {users === null && !err && <ul className="rows"><li className="row skeleton" /></ul>}

      <ul className="rows">
        {(users ?? []).map((u) => {
          const isMe = u.id === me.id;
          return (
            <li key={u.id} className={`urow ${u.disabled ? "off" : ""}`}>
              <div className="urow-head">
                <div className="urow-id">
                  <strong>{u.email}</strong>
                  {u.role === "admin" && <span className="badge"><ShieldCheck size={13} /> Admin</span>}
                  {u.disabled && <span className="badge muted">Disabled</span>}
                  {isMe && <span className="badge muted">You</span>}
                </div>
                <div className="actions">
                  <button className="btn" onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setNewPw(generate()); }}>
                    <KeyRound size={15} /> Reset password
                  </button>
                  {!isMe && (u.disabled
                    ? <button className="btn" onClick={() => patch(u.id, { disabled: false }, "User enabled")}><UserCheck size={15} /> Enable</button>
                    : <button className="btn" onClick={() => setToDisable(u)}><UserX size={15} /> Disable</button>)}
                </div>
              </div>
              <div className="urow-domains">
                <span className="label">Domains</span>
                {u.role === "admin"
                  ? <span className="hint">All domains (administrator)</span>
                  : <DomainChecks domains={domains} value={u.domains} onChange={(v) => patch(u.id, { domains: v }, "Domain access updated")} />}
              </div>
              {resetFor === u.id && (
                <div className="inline reset">
                  <input value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={10} spellCheck={false} autoComplete="off" aria-label="New password" />
                  <button className="btn" onClick={() => setNewPw(generate())}>Generate</button>
                  <button className="btn primary" disabled={newPw.length < 10} onClick={async () => {
                    if (await patch(u.id, { password: newPw }, "Password reset. Copied to clipboard.")) { navigator.clipboard?.writeText(newPw).catch(() => {}); setResetFor(null); }
                  }}>Set password</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {toDisable && (
        <ConfirmDialog
          title="Disable this user?"
          body={`${toDisable.email} will be signed out and won't be able to sign in. Their links keep working. You can enable them again later.`}
          confirmLabel="Disable user"
          onConfirm={() => { patch(toDisable.id, { disabled: true }, "User disabled"); setToDisable(null); }}
          onCancel={() => setToDisable(null)}
        />
      )}
    </main>
  );
}
