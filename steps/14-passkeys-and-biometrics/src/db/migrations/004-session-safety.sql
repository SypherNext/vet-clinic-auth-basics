-- Lesson 7: every session carries its own CSRF token.
ALTER TABLE sessions ADD COLUMN csrf_token TEXT NOT NULL DEFAULT '';
