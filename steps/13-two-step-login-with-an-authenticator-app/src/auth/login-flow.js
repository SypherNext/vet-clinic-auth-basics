// The end of every login, whichever method proved who the visitor is.
//
// finishLogin() returns the path to send the browser to next. It never writes
// the response body itself, so a form route can call res.redirect(path) and
// another kind of route could reply in a different way.
import { ensureSession, startUserSession, updateSessionData } from '../sessions/sessions.js';
import { findUserById } from '../users/users.js';
import { recordAuthEvent } from '../audit/auth-events.js';
import { homePathFor } from '../access/roles.js';

export const TWO_STEP_PATH = '/login/two-step';

function hasAuthenticatorApp(user) {
  return user.totp_enabled_at !== null;
}

export function finishLogin(deps, req, res, user, method) {
  if (hasAuthenticatorApp(user)) {
    // First step done. Remember that, but do not log in yet.
    ensureSession(deps, req, res);
    updateSessionData(deps, req, {
      pendingLogin: { userId: user.id, methodId: method.id, startedAt: deps.clock.now() },
    });
    return TWO_STEP_PATH;
  }
  return completeLogin(deps, req, res, user, method.id);
}

// Starts the logged-in session. Called by finishLogin(), or by the two-step
// page once the second step is done.
export function completeLogin(deps, req, res, user, methodId) {
  startUserSession(deps, req, res, user.id);
  recordAuthEvent(deps, req, { userId: user.id, event: 'login_succeeded', method: methodId });
  return homePathFor(user);
}

// The login waiting for its second step, or null if there is none or it is too old.
export function pendingLogin(deps, req) {
  const pending = req.session?.data.pendingLogin;
  if (!pending) return null;
  if (deps.clock.now() - pending.startedAt > deps.config.sessions.pendingLoginMs) {
    updateSessionData(deps, req, { pendingLogin: undefined });
    return null;
  }
  const user = findUserById(deps.db, pending.userId);
  return user ? { user, methodId: pending.methodId } : null;
}
