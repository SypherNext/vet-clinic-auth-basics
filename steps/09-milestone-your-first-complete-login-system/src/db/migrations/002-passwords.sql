-- Lesson 5: each user gets a password hash (never the password itself).
-- NULL means the account has no password yet.
ALTER TABLE users ADD COLUMN password_hash TEXT;
