// Random session tokens and their hashes. All randomness comes from
// node:crypto, never Math.random().
import crypto from 'node:crypto';

const TOKEN_BYTES = 32; // 256 bits: far too many to guess

export function randomToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

// A fast hash is fine here because the token is long and random.
// (Passwords are different: people pick guessable ones, so they get argon2id.)
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('base64url');
}
