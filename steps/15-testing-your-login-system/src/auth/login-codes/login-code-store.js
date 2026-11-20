// Reads and writes the login_codes table: short codes sent by email or SMS.
//
// A 6-digit code has only a million possible values, so its hash does not
// make it hard to work out. The hash only stops anyone reading live codes
// straight out of the table. The real protection is that each code lives
// for 10 minutes and allows 5 tries.
import { hashToken, sameSecret } from '../../security/tokens.js';

export function createLoginCode(db, { userId, channel, code, lifetimeMs, now }) {
  // A new code replaces any older code that has not been used.
  db.prepare('DELETE FROM login_codes WHERE user_id = ? AND used_at IS NULL').run(userId);
  db.prepare(`INSERT INTO login_codes (user_id, channel, code_hash, expires_at, created_at)
              VALUES (?, ?, ?, ?, ?)`).run(userId, channel, hashToken(code), now + lifetimeMs, now);
}

// The user's current code, if it is unused, not expired and has tries left.
export function findActiveLoginCode(db, { userId, maxAttempts, now }) {
  return db.prepare(`SELECT * FROM login_codes
                     WHERE user_id = ? AND used_at IS NULL AND expires_at > ? AND attempts < ?
                     ORDER BY id DESC LIMIT 1`).get(userId, now, maxAttempts) ?? null;
}

export function codeMatches(loginCode, code) {
  return sameSecret(loginCode.code_hash, hashToken(code));
}

// Returns how many tries were used, including this one.
export function recordWrongCode(db, loginCodeId) {
  return db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? RETURNING attempts')
    .get(loginCodeId).attempts;
}

export function markLoginCodeUsed(db, loginCodeId, now) {
  db.prepare('UPDATE login_codes SET used_at = ? WHERE id = ?').run(now, loginCodeId);
}
