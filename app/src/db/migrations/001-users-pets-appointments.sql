-- The clinic's core data: people, their pets, and appointments.
-- role is one of: owner (a pet owner), vet, admin.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),
  phone TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE pets (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  born_on TEXT
);

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vet_id INTEGER NOT NULL REFERENCES users(id),
  starts_at TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE INDEX pets_owner ON pets(owner_id);
CREATE INDEX appointments_vet ON appointments(vet_id);
