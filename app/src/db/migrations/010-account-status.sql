-- Lesson 16: an admin can switch an account off without deleting it.
ALTER TABLE users ADD COLUMN disabled_at INTEGER;
