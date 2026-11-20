// The account page: one place to see and manage how you log in.
// The forms on it post to the routes of each login method.
import express from 'express';
import { requireLogin } from '../access/require.js';
import { listUserSessions } from '../sessions/session-store.js';
import { recentAuthEvents } from '../audit/auth-events.js';
import { methodName } from '../auth/login-methods.js';
import { countUnusedRecoveryCodes } from '../auth/authenticator-app/recovery-codes.js';

export function accountRoutes(deps) {
  const { db, config } = deps;
  const router = express.Router();

  router.get('/account', requireLogin, (req, res) => {
    const user = req.user;
    res.render('account', {
      minLength: config.passwords.minLength,
      hasPassword: user.password_hash !== null,
      emailVerified: user.email_verified_at !== null,
      twoStepOn: user.totp_enabled_at !== null,
      unusedRecoveryCodes: countUnusedRecoveryCodes(db, user.id),
      sessions: listUserSessions(db, user.id).map((s) => ({ ...s, current: s.id === req.session.id })),
      events: recentAuthEvents(db, user.id).map((e) => ({ ...e, methodName: e.method ? methodName(e.method) : '' })),
    });
  });

  return router;
}
