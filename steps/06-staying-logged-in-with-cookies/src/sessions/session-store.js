// Reads and writes the sessions table. Nothing here knows about cookies or
// requests; sessions.js handles that.
//
// The browser holds a random token. The table holds only its SHA-256 hash,
// so someone who copies the database still cannot log in as anyone.
import { randomToken, hashToken } from '../security/tokens.js';

export function createSession(db, { userId, now }) {
  const token = randomToken();
  db.prepare('INSERT INTO sessions (id, user_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, now, now);
  return token;
}

export function findSessionByToken(db, token) {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(hashToken(token));
  return row ? { id: row.id, userId: row.user_id } : null;
}

export function deleteSession(db, sessionId) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
