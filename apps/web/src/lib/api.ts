export type QrOptions = { fg: string; bg: string; logoScale: number };
export type Entry = {
  id: string; title: string; targetUrl: string; slug: string; domain: string; shortUrl: string;
  qrOptions: Partial<QrOptions>; logo: string | null; ownerEmail: string | null; createdAt: string; updatedAt: string;
};
export type Domain = { id: string; label: string; base: string };
export type EntryInput = {
  title?: string; targetUrl?: string; slug?: string; domain?: string; qrOptions?: QrOptions; logo?: string | null;
};

export type User = { id: string; email: string; role: "admin" | "user"; domains: string[] };
export type AdminUser = { id: string; email: string; role: "admin" | "user"; disabled: boolean; createdAt: string; domains: string[] };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json" } });
  if (res.status === 401 && !path.startsWith("/api/auth/login")) window.dispatchEvent(new Event("lq:unauthorized"));
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  me: () => req<{ user: User }>("/api/auth/me"),
  login: (email: string, password: string) => req<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => req<void>("/api/auth/logout", { method: "POST" }),
  changePassword: (current: string, next: string) => req<void>("/api/auth/password", { method: "POST", body: JSON.stringify({ current, next }) }),
  users: () => req<AdminUser[]>("/api/admin/users"),
  createUser: (b: { email: string; password: string; role: "admin" | "user"; domains: string[] }) =>
    req<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(b) }),
  updateUser: (id: string, b: { domains?: string[]; disabled?: boolean; role?: "admin" | "user"; password?: string }) =>
    req<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  settings: () => req<{ defaultLogo: string | null }>("/api/settings"),
  saveDefaultLogo: (logo: string) => req<{ defaultLogo: string }>("/api/settings/default-logo", { method: "PUT", body: JSON.stringify({ logo }) }),
  config: () => req<{ domains: Domain[] }>("/api/config"),
  list: () => req<Entry[]>("/api/entries"),
  create: (b: EntryInput) => req<Entry>("/api/entries", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: EntryInput) => req<Entry>(`/api/entries/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  remove: (id: string) => req<void>(`/api/entries/${id}`, { method: "DELETE" }),
  slugAvailable: (s: string, domain: string) =>
    req<{ available: boolean }>(`/api/slug/${encodeURIComponent(s)}/available?domain=${encodeURIComponent(domain)}`),
};
