// Recovery codes: ten single-use backup codes for when the phone with the
// authenticator app is lost. Shown once, stored only as hashes.
import { randomCharacters, hashToken } from '../../security/tokens.js';

// No 0/O or 1/l/i, so codes are easy to copy from paper.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const HALF_LENGTH = 5; // codes look like "k7m2p-x9qrt": about 50 bits

function normalize(code) {
  return String(code).trim().toLowerCase().replace(/[\s-]/g, '');
}

// Replaces any old codes and returns the new ones (the only time they exist in plain text).
export function createRecoveryCodes(db, userId, count) {
  db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)');
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = `${randomCharacters(HALF_LENGTH, ALPHABET)}-${randomCharacters(HALF_LENGTH, ALPHABET)}`;
    insert.run(userId, hashToken(normalize(code)));
    codes.push(code);
  }
  return codes;
}

// Uses up one code. True if it was a valid, unused code for this user.
export function useRecoveryCode(db, userId, code, now) {
  const result = db.prepare(`UPDATE recovery_codes SET used_at = ?
                             WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`)
    .run(now, userId, hashToken(normalize(code)));
  return result.changes === 1;
}

export function countUnusedRecoveryCodes(db, userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL').get(userId).n;
}

export function deleteRecoveryCodes(db, userId) {
  db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(userId);
}
