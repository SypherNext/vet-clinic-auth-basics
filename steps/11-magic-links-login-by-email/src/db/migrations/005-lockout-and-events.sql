-- Lesson 9: count wrong passwords and lock the account for a while.
ALTER TABLE users ADD COLUMN failed_logins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until INTEGER;

-- A history of sign-ins and security changes, shown on the account page.
CREATE TABLE auth_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  method TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX auth_events_user ON auth_events(user_id, created_at);
