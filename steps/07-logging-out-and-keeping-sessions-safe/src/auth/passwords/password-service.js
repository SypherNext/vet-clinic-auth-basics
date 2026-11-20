// The rules for logging in with a password and for setting a new one.
// The login form and the change-password form both use these functions.
import { findUserByEmail, setPasswordHash } from '../../users/users.js';
import { deleteUserSessions } from '../../sessions/session-store.js';
import { verifyPassword, hashPassword, needsRehash, spendTimeOfOneCheck } from './password-hashing.js';
import { problemWithNewPassword } from './password-policy.js';

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

// Saves a new password and logs the user out everywhere else.
// Returns a message if the password breaks the rules, otherwise null.
export async function setNewPassword(deps, user, newPassword, { keepSessionId = null } = {}) {
  const problem = problemWithNewPassword(newPassword, deps.config.passwords, { email: user.email });
  if (problem) return problem;
  setPasswordHash(deps.db, user.id, await hashPassword(newPassword));
  deleteUserSessions(deps.db, user.id, { exceptSessionId: keepSessionId });
  return null;
}
