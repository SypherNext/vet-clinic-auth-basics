// Logging out: here, and on all your other devices.
import express from 'express';
import { endSession, setFlash } from './sessions.js';
import { deleteUserSessions } from './session-store.js';
import { requireLogin } from '../access/require.js';
import { plural } from '../format.js';

export function sessionRoutes(deps) {
  const router = express.Router();

  // POST, not GET: a link or an image on another site must not be able to log you out.
  router.post('/logout', (req, res) => {
    endSession(deps, req, res);
    res.redirect('/login');
  });

  router.post('/account/sessions/logout-others', requireLogin, (req, res) => {
    const count = deleteUserSessions(deps.db, req.user.id, { exceptSessionId: req.session.id });
    setFlash(deps, req, res, `Logged out of ${plural(count, 'other session')}.`);
    res.redirect('/account');
  });

  return router;
}
