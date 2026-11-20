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

export function listUsers(db) {
  return db.prepare('SELECT id, email, name, role FROM users ORDER BY role, name').all();
}

export function createUser(db, { email, name, role = 'owner', phone = null, passwordHash, now }) {
  const result = db.prepare(`INSERT INTO users (email, name, role, phone, password_hash, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`).run(email, name, role, phone, passwordHash, now);
  return findUserById(db, Number(result.lastInsertRowid));
}

export function setPasswordHash(db, userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}
