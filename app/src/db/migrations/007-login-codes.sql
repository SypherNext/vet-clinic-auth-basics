-- Lesson 12: short one-time codes sent by email or text message.
CREATE TABLE login_codes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX login_codes_user ON login_codes(user_id);

-- A SIMULATED phone network: text messages are stored here and shown on the
-- developer page /dev/sms-outbox instead of being sent to a real phone.
CREATE TABLE sms_outbox (
  id INTEGER PRIMARY KEY,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
