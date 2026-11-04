PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('student','advisor','admin')),
 password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 must_change INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS placements (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), advisor_id TEXT NOT NULL REFERENCES users(id),
 school TEXT NOT NULL, project TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
 target REAL NOT NULL CHECK(target > 0 AND target <= 2000), version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS placement_student ON placements(student_id);
CREATE INDEX IF NOT EXISTS placement_advisor ON placements(advisor_id);
CREATE TABLE IF NOT EXISTS activities (
 id TEXT PRIMARY KEY, placement_id TEXT NOT NULL REFERENCES placements(id), title TEXT NOT NULL,
 description TEXT NOT NULL, date TEXT NOT NULL, hours REAL NOT NULL CHECK(hours >= 0.5 AND hours <= 12),
 status TEXT NOT NULL CHECK(status IN ('draft','pending','correction','approved')),
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS activity_placement ON activities(placement_id);
CREATE TABLE IF NOT EXISTS evidence (
 activity_id TEXT PRIMARY KEY REFERENCES activities(id), name TEXT NOT NULL, mime TEXT NOT NULL,
 content BLOB NOT NULL, size INTEGER NOT NULL CHECK(size <= 2097152), sha256 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
 id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
 decision TEXT NOT NULL CHECK(decision IN ('approved','correction')), comment TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
 key TEXT PRIMARY KEY, failures INTEGER NOT NULL, reset_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY, user_id TEXT REFERENCES users(id), action TEXT NOT NULL,
 entity_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
PRAGMA user_version = 1;
