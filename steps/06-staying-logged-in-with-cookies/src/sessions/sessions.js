// Sessions from the point of view of a request: read the cookie, find the
// user, start a session at login, end it at logout.
import { readCookie } from '../http/cookies.js';
import { findUserById } from '../users/users.js';
import { createSession, findSessionByToken, deleteSession } from './session-store.js';

function cookieOptions(sessionConfig) {
  return {
    httpOnly: true, // page scripts cannot read it, so an XSS bug cannot steal it
    sameSite: 'lax', // not sent on form posts from other sites
    secure: sessionConfig.secureCookies, // HTTPS only (always on in production)
    path: '/',
  };
}

// Runs on every request: finds the visitor's session and their user, if any.
export function sessionMiddleware(deps) {
  const { db, config } = deps;
  return (req, res, next) => {
    req.session = null;
    req.user = null;
    const token = readCookie(req, config.sessions.cookieName);
    const session = token ? findSessionByToken(db, token) : null;
    if (session) {
      req.session = session;
      req.user = findUserById(db, session.userId);
    }
    next();
  };
}

// Called after a successful login: a new random token in a new cookie.
export function startUserSession(deps, req, res, userId) {
  const { db, config } = deps;
  if (req.session) deleteSession(db, req.session.id);
  const token = createSession(db, { userId, now: Date.now() });
  res.cookie(config.sessions.cookieName, token, cookieOptions(config.sessions));
}

export function endSession(deps, req, res) {
  if (req.session) deleteSession(deps.db, req.session.id);
  res.clearCookie(deps.config.sessions.cookieName, cookieOptions(deps.config.sessions));
}

// Makes the logged-in user available to every page template.
export function viewLocals(req, res, next) {
  res.locals.user = req.user;
  next();
}
