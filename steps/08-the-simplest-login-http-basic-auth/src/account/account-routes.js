// The account page: one place to see and manage how you log in.
// The forms on it post to the routes of each login method.
import express from 'express';
import { requireLogin } from '../access/require.js';
import { listUserSessions } from '../sessions/session-store.js';

export function accountRoutes(deps) {
  const { db, config } = deps;
  const router = express.Router();

  router.get('/account', requireLogin, (req, res) => {
    const user = req.user;
    res.render('account', {
      minLength: config.passwords.minLength,
      hasPassword: user.password_hash !== null,
      sessions: listUserSessions(db, user.id).map((s) => ({ ...s, current: s.id === req.session.id })),
    });
  });

  return router;
}
