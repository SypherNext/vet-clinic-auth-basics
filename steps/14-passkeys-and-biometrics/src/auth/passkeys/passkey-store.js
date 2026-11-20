// Reads and writes the passkeys table. A passkey row holds a PUBLIC key: it
// can check a signature but cannot make one, so this table is not a secret.

function toPasskey(row) {
  return {
    id: row.id,
    userId: row.user_id,
    publicKey: new Uint8Array(row.public_key),
    counter: row.counter,
    transports: JSON.parse(row.transports),
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    name: row.name,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export function savePasskey(db, { userId, credential, deviceType, backedUp, name, now }) {
  db.prepare(`INSERT INTO passkeys (id, user_id, public_key, counter, transports, device_type, backed_up, name, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(credential.id, userId, credential.publicKey, credential.counter,
      JSON.stringify(credential.transports ?? []), deviceType, backedUp ? 1 : 0, name, now);
}

export function findPasskey(db, credentialId) {
  const row = db.prepare('SELECT * FROM passkeys WHERE id = ?').get(String(credentialId));
  return row ? toPasskey(row) : null;
}

export function listPasskeys(db, userId) {
  return db.prepare('SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at').all(userId).map(toPasskey);
}

export function recordPasskeyUse(db, credentialId, { counter, now }) {
  db.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ?').run(counter, now, credentialId);
}

export function deletePasskey(db, userId, credentialId) {
  return db.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').run(credentialId, userId).changes === 1;
}
