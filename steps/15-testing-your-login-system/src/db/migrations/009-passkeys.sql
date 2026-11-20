-- Lesson 14: passkeys (WebAuthn credentials).
-- webauthn_user_id is a random handle given to authenticators instead of the
-- email or database id, so a passkey does not reveal who it belongs to.
ALTER TABLE users ADD COLUMN webauthn_user_id TEXT;
CREATE UNIQUE INDEX users_webauthn_user_id ON users(webauthn_user_id);

CREATE TABLE passkeys (
  id TEXT PRIMARY KEY,                -- the credential ID, base64url
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '[]',
  device_type TEXT,                   -- singleDevice or multiDevice (synced)
  backed_up INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX passkeys_user ON passkeys(user_id);
