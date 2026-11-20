// The rules for logging in with a password.
import { findUserByEmail, setPasswordHash } from '../../users/users.js';
import { verifyPassword, hashPassword, needsRehash, spendTimeOfOneCheck } from './password-hashing.js';

// The same words for a wrong email and a wrong password, so the form does
// not reveal which emails have accounts.
export const WRONG_LOGIN_MESSAGE = 'That email and password do not match an account.';

// Returns { user } on success, or { failure: 'invalid' }.
export async function checkPasswordLogin(deps, { email, password }) {
  const user = findUserByEmail(deps.db, email);
  if (!user || !user.password_hash) {
    await spendTimeOfOneCheck(password);
    return { failure: 'invalid' };
  }
  if (!(await verifyPassword(user.password_hash, password))) return { failure: 'invalid' };

  // Old hashes made with weaker settings are upgraded while we have the password.
  if (needsRehash(user.password_hash)) setPasswordHash(deps.db, user.id, await hashPassword(password));
  return { user };
}
