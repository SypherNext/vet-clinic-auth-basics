// The admin's user list, with the account actions an admin may take.
import express from 'express';
import { listUsersForAdmin, findUserById, setDisabled, clearFailedLogins } from '../users/users.js';
import { deleteUserSessions } from '../sessions/session-store.js';
import { setFlash } from '../sessions/sessions.js';
import { requireRole } from '../access/require.js';
import { recordAuthEvent } from '../audit/auth-events.js';
import { HttpError } from '../http/errors.js';

// Each action: what it does, which event it records, what the admin is told.
// allowedOnSelf is false where an admin could lock themselves out by mistake.
const ADMIN_ACTIONS = {
  disable: {
    run: (db, user, now) => {
      setDisabled(db, user.id, now);
      deleteUserSessions(db, user.id); // logged out right away, not at their next click
    },
    event: 'account_disabled',
    message: (user) => `${user.name} can no longer log in.`,
    allowedOnSelf: false,
  },
  enable: {
    run: (db, user) => setDisabled(db, user.id, null),
    event: 'account_enabled',
    message: (user) => `${user.name} can log in again.`,
    allowedOnSelf: true,
  },
  unlock: {
    run: (db, user) => clearFailedLogins(db, user.id),
    event: 'account_unlocked',
    message: (user) => `${user.name} is unlocked and can try a password again.`,
    allowedOnSelf: true,
  },
  'logout-everywhere': {
    run: (db, user) => deleteUserSessions(db, user.id),
    event: 'sessions_ended_by_admin',
    message: (user) => `${user.name} has been logged out on every device.`,
    allowedOnSelf: false,
  },
};

export function adminRoutes(deps) {
  const { db, clock } = deps;
  const router = express.Router();
  const adminOnly = requireRole('admin');

  router.get('/admin/users', adminOnly, (req, res) => {
    res.render('admin-users', { users: listUsersForAdmin(db, clock.now()) });
  });

  router.post('/admin/users/:id/:action', adminOnly, (req, res) => {
    const action = ADMIN_ACTIONS[req.params.action];
    const target = findUserById(db, Number(req.params.id));
    if (!action || !target) throw new HttpError(404, 'Not found', 'There is no such user or action.');
    if (target.id === req.user.id && !action.allowedOnSelf) {
      throw new HttpError(400, 'Not on yourself', 'You cannot do that to your own account.');
    }
    action.run(db, target, clock.now());
    recordAuthEvent(deps, req, { userId: target.id, event: action.event });
    setFlash(deps, req, res, action.message(target));
    res.redirect('/admin/users');
  });

  return router;
}
