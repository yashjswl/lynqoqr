-- Links now belong to a short-link domain. Slugs are unique per domain, not globally.
CREATE TABLE entries_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_url TEXT NOT NULL,
  slug TEXT NOT NULL,
  qr_options TEXT NOT NULL DEFAULT '{}',
  logo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  domain TEXT NOT NULL DEFAULT 'primary',
  UNIQUE (domain, slug)
);
INSERT INTO entries_new (id, title, target_url, slug, qr_options, logo, created_at, updated_at)
  SELECT id, title, target_url, slug, qr_options, logo, created_at, updated_at FROM entries;
DROP TABLE entries;
ALTER TABLE entries_new RENAME TO entries;
CREATE INDEX idx_entries_created ON entries (created_at DESC);
