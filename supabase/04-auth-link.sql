-- Solo agrega la referencia de identidad. No cambia correos, contraseñas ni usuarios.
BEGIN;
ALTER TABLE icasys.users ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_identity ON icasys.users(auth_user_id);
COMMIT;
