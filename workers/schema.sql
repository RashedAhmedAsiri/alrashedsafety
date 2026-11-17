-- D1 schema for the Alrashed app. Apply with:
--   npx wrangler d1 execute alrashed-results --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS exam_results (
  id           TEXT PRIMARY KEY,
  device_id    TEXT NOT NULL,
  phase        TEXT NOT NULL CHECK (phase IN ('pre', 'post')),
  score        INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  answers      TEXT NOT NULL,   -- ten characters of 1 or 0
  input        TEXT NOT NULL,   -- ten characters of v (voice) or t (tap)
  gender       TEXT NOT NULL CHECK (gender IN ('boy', 'girl', 'unknown')),
  created_at   TEXT NOT NULL,   -- UTC ISO timestamp
  app_version  TEXT NOT NULL,
  exam_version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_created ON exam_results (created_at);
CREATE INDEX IF NOT EXISTS idx_results_device ON exam_results (device_id, phase);

-- Teacher PIN (salted SHA-256), one row per key.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
