-- Migración aditiva para instalaciones existentes. No cambia usuarios ni contraseñas.
BEGIN;
CREATE TABLE IF NOT EXISTS icasys.password_resets (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES icasys.users(id),
 email TEXT NOT NULL,
 password_digest TEXT NOT NULL,
 expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user ON icasys.password_resets(user_id);
REVOKE ALL ON TABLE icasys.password_resets FROM PUBLIC,anon,authenticated;
ALTER TABLE icasys.password_resets ENABLE ROW LEVEL SECURITY;
COMMIT;
