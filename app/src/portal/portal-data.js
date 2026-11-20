// Database queries for the clinic pages. Every query is filtered by the
// person asking, so an owner only ever gets their own pets back.

const APPOINTMENT_COLUMNS = `
  a.id, a.starts_at, a.reason, p.name AS pet_name, p.species,
  o.name AS owner_name, v.name AS vet_name`;
const APPOINTMENT_JOINS = `
  FROM appointments a
  JOIN pets p ON p.id = a.pet_id
  JOIN users o ON o.id = p.owner_id
  JOIN users v ON v.id = a.vet_id`;

export function petsForOwner(db, ownerId) {
  const pets = db.prepare('SELECT * FROM pets WHERE owner_id = ? ORDER BY name').all(ownerId);
  const appointments = db.prepare(`SELECT ${APPOINTMENT_COLUMNS} ${APPOINTMENT_JOINS}
                                    WHERE a.pet_id = ? ORDER BY a.starts_at`);
  return pets.map((pet) => ({ ...pet, appointments: appointments.all(pet.id) }));
}

export function patientsForVet(db, vetId) {
  return db.prepare(`SELECT ${APPOINTMENT_COLUMNS} ${APPOINTMENT_JOINS}
                     WHERE a.vet_id = ? ORDER BY a.starts_at`).all(vetId);
}

// The appointments a user may see: their pets', their patients', or all for an admin.
export function appointmentsForUser(db, user) {
  const filters = {
    owner: 'WHERE p.owner_id = :id',
    vet: 'WHERE a.vet_id = :id',
    admin: '',
  };
  return db.prepare(`SELECT ${APPOINTMENT_COLUMNS} ${APPOINTMENT_JOINS} ${filters[user.role]} ORDER BY a.starts_at`)
    .all(user.role === 'admin' ? {} : { id: user.id });
}
