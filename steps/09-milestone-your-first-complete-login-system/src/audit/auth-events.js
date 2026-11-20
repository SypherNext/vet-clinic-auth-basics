// A history of sign-ins and security changes. Users see their own on the
// account page, which is how many people first notice someone else got in.

// Every event the app records, with the words the account page shows.
export const EVENT_LABELS = {
  login_succeeded: 'Logged in',
  login_failed: 'Wrong password',
  account_locked: 'Locked after too many wrong passwords',
  logged_out: 'Logged out',
  other_sessions_ended: 'Logged out other sessions',
  password_changed: 'Password changed',
};

export function recordAuthEvent(deps, req, { userId, event, method = null }) {
  if (!(event in EVENT_LABELS)) throw new Error(`unknown auth event: ${event}`);
  deps.db.prepare('INSERT INTO auth_events (user_id, event, method, ip, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, event, method, req.ip ?? null, deps.clock.now());
}

export function recentAuthEvents(db, userId, limit = 10) {
  return db.prepare('SELECT * FROM auth_events WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(userId, limit)
    .map((row) => ({ ...row, label: EVENT_LABELS[row.event] }));
}
