CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_url TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  qr_options TEXT NOT NULL DEFAULT '{}',
  logo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_entries_created ON entries (created_at DESC);
