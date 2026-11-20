-- Lesson 10: proof that the user can read their inbox.
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;

-- One-use links sent by email. purpose is verify_email, reset_password or
-- magic_link (lesson 11). Only a hash of the token is stored.
CREATE TABLE email_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX email_tokens_user ON email_tokens(user_id, purpose);
