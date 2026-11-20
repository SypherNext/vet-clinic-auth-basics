// The rules for logging in with a password and for setting a new one.
// The login form, HTTP Basic Auth, the change-password form and the
// reset-password link all use these functions, so they all behave the same.
import {
  findUserByEmail, isLocked, recordFailedLogin, clearFailedLogins, setPasswordHash,
} from '../../users/users.js';
import { deleteUserSessions } from '../../sessions/session-store.js';
import { verifyPassword, hashPassword, needsRehash, spendTimeOfOneCheck } from './password-hashing.js';
import { problemWithNewPassword } from './password-policy.js';
import { recordAuthEvent } from '../../audit/auth-events.js';
import { formatDuration } from '../../format.js';

// Returns { user } on success, or { failure: 'invalid' | 'locked' }.
export async function checkPasswordLogin(deps, req, { email, password }) {
  const { db, config, clock } = deps;
  const user = findUserByEmail(db, email);

  if (!user || !user.password_hash) {
    await spendTimeOfOneCheck(password);
    return { failure: 'invalid' };
  }
  if (isLocked(user, clock.now())) return { failure: 'locked' };

  if (!(await verifyPassword(user.password_hash, password))) {
    const nowLocked = recordFailedLogin(db, user.id, config.lockout, clock.now());
    recordAuthEvent(deps, req, {
      userId: user.id, event: nowLocked ? 'account_locked' : 'login_failed', method: 'password',
    });
    return { failure: nowLocked ? 'locked' : 'invalid' };
  }

  clearFailedLogins(db, user.id);
  // Old hashes made with weaker settings are upgraded while we have the password.
  if (needsRehash(user.password_hash)) setPasswordHash(db, user.id, await hashPassword(password));
  return { user };
}

// The same words for a wrong email and a wrong password, so the form does
// not reveal which emails have accounts.
export function loginFailureMessage(failure, config) {
  if (failure === 'locked') {
    return `Too many wrong passwords. This account is locked for ${formatDuration(config.lockout.lockMs)}.`;
  }
  return 'That email and password do not match an account.';
}

// Saves a new password and logs the user out everywhere else.
// Returns a message if the password breaks the rules, otherwise null.
export async function setNewPassword(deps, req, user, newPassword, { event, keepSessionId = null }) {
  const problem = problemWithNewPassword(newPassword, deps.config.passwords, { email: user.email });
  if (problem) return problem;
  setPasswordHash(deps.db, user.id, await hashPassword(newPassword));
  clearFailedLogins(deps.db, user.id);
  deleteUserSessions(deps.db, user.id, { exceptSessionId: keepSessionId });
  recordAuthEvent(deps, req, { userId: user.id, event });
  return null;
}
