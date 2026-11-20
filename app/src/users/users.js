// Everything the app asks the database about people.
// Each function takes the database as its first argument, so tests can pass
// in a fresh in-memory database.

// email may be null (a form field that did not pass validation): no user then.
export function findUserByEmail(db, email) {
  if (!email) return null;
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) ?? null;
}

export function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) ?? null;
}

// An admin can switch an account off (lesson 16). It then cannot log in.
export function isActive(user) {
  return user.disabled_at === null;
}

// A user who may use the portal right now: exists and is not switched off.
export function findActiveUserById(db, id) {
  const user = findUserById(db, id);
  return user && isActive(user) ? user : null;
}

export function findActiveUserByEmail(db, email) {
  const user = findUserByEmail(db, email);
  return user && isActive(user) ? user : null;
}

export function createUser(db, { email, name, role = 'owner', phone = null, passwordHash, now }) {
  const result = db.prepare(`INSERT INTO users (email, name, role, phone, password_hash, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`).run(email, name, role, phone, passwordHash, now);
  return findUserById(db, Number(result.lastInsertRowid));
}

export function setPasswordHash(db, userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

// ----- Wrong passwords and lockout (lesson 9) -----

export function isLocked(user, now) {
  return user.locked_until !== null && user.locked_until > now;
}

// Adds one failed attempt. Returns true when this attempt locked the account.
export function recordFailedLogin(db, userId, { maxFailedLogins, lockMs }, now) {
  const { failed_logins: failures } = db.prepare(
    'UPDATE users SET failed_logins = failed_logins + 1 WHERE id = ? RETURNING failed_logins').get(userId);
  if (failures < maxFailedLogins) return false;
  db.prepare('UPDATE users SET locked_until = ?, failed_logins = 0 WHERE id = ?').run(now + lockMs, userId);
  return true;
}

export function clearFailedLogins(db, userId) {
  db.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').run(userId);
}

// ----- Email (lesson 10) -----

export function markEmailVerified(db, userId, now) {
  db.prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?').run(now, userId);
}

// ----- Authenticator app (lesson 13) -----

export function enableAuthenticatorApp(db, userId, { secret, now }) {
  db.prepare('UPDATE users SET totp_secret = ?, totp_enabled_at = ?, totp_last_step = NULL WHERE id = ?')
    .run(secret, now, userId);
}

export function disableAuthenticatorApp(db, userId) {
  db.prepare('UPDATE users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_step = NULL WHERE id = ?')
    .run(userId);
}

export function setTotpLastStep(db, userId, step) {
  db.prepare('UPDATE users SET totp_last_step = ? WHERE id = ?').run(step, userId);
}

// ----- Passkeys (lesson 14) -----

export function setWebauthnUserId(db, userId, webauthnUserId) {
  db.prepare('UPDATE users SET webauthn_user_id = ? WHERE id = ?').run(webauthnUserId, userId);
}

// ----- Admin (lesson 16) -----

export function listUsersForAdmin(db, now) {
  return db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.email_verified_at, u.totp_enabled_at, u.disabled_at,
           (u.locked_until IS NOT NULL AND u.locked_until > :now) AS locked,
           (SELECT COUNT(*) FROM passkeys p WHERE p.user_id = u.id) AS passkey_count,
           (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) AS session_count
    FROM users u ORDER BY u.role, u.name`).all({ now });
}

export function setDisabled(db, userId, disabledAt) {
  db.prepare('UPDATE users SET disabled_at = ? WHERE id = ?').run(disabledAt, userId);
}
