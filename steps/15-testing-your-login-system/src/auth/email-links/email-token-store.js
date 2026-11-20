// Reads and writes the email_tokens table: one-use links sent by email.
// Only the SHA-256 hash of each token is stored, like session tokens.
import { randomToken, hashToken } from '../../security/tokens.js';

export function createEmailToken(db, { userId, purpose, lifetimeMs, now }) {
  // Sending a new link cancels any older unused link for the same purpose.
  db.prepare('DELETE FROM email_tokens WHERE user_id = ? AND purpose = ? AND used_at IS NULL').run(userId, purpose);
  const token = randomToken();
  db.prepare(`INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at, created_at)
              VALUES (?, ?, ?, ?, ?)`).run(userId, purpose, hashToken(token), now + lifetimeMs, now);
  return token;
}

// Looks at a token without using it up (to show a "Confirm" page).
export function findUsableEmailToken(db, { token, purpose, now }) {
  return db.prepare(`SELECT * FROM email_tokens
                     WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?`)
    .get(hashToken(token), purpose, now) ?? null;
}

// Uses a token up and returns its user id, or null if it is unknown, used or
// expired. One UPDATE does the check and the change together, so two clicks
// at the same moment cannot both succeed.
export function useEmailToken(db, { token, purpose, now }) {
  const row = db.prepare(`UPDATE email_tokens SET used_at = :now
                          WHERE token_hash = :hash AND purpose = :purpose AND used_at IS NULL AND expires_at > :now
                          RETURNING user_id`).get({ now, hash: hashToken(token), purpose });
  return row?.user_id ?? null;
}
