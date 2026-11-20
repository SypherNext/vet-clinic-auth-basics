// The end of every login, whichever method proved who the visitor is.
//
// finishLogin() returns the path to send the browser to next. It never writes
// the response body itself, so a form route can call res.redirect(path) and
// another kind of route could reply in a different way.
import { startUserSession } from '../sessions/sessions.js';
import { recordAuthEvent } from '../audit/auth-events.js';
import { homePathFor } from '../access/roles.js';

export function finishLogin(deps, req, res, user, method) {
  startUserSession(deps, req, res, user.id);
  recordAuthEvent(deps, req, { userId: user.id, event: 'login_succeeded', method: method.id });
  return homePathFor(user);
}
