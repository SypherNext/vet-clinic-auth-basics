-- Lesson 13: two-step login with an authenticator app (TOTP).
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled_at INTEGER;
-- The last time step that was accepted, so the same code cannot be used twice.
ALTER TABLE users ADD COLUMN totp_last_step INTEGER;

-- Backup codes for when the phone is lost. Only hashes are stored.
CREATE TABLE recovery_codes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at INTEGER
);
CREATE INDEX recovery_codes_user ON recovery_codes(user_id);
