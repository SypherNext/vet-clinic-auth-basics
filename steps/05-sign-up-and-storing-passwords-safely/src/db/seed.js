// Fills the database with fake people, pets and appointments.
// Run it with `npm run seed`. It deletes the old database file first,
// so you always start from the same known state.
//
// Every person here is made up. The .test domain is reserved for testing
// and can never receive real email. The passwords are printed in the README
// on purpose: they only exist on your computer.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '../config.js';
import { openDatabase } from './database.js';
import { createUser } from '../users/users.js';
import { hashPassword } from '../auth/passwords/password-hashing.js';

export const SEED_USERS = [
  { email: 'olivia@vetclinic.test', name: 'Olivia Park', role: 'owner', phone: '+1 555 0101', password: 'biscuit and mango love naps' },
  { email: 'ben@vetclinic.test', name: 'Ben Okafor', role: 'owner', phone: '+1 555 0102', password: 'pepper the rabbit hops daily' },
  { email: 'sam@vetclinic.test', name: 'Dr. Sam Rivera', role: 'vet', phone: '+1 555 0201', password: 'stethoscope on a rainy tuesday' },
  { email: 'lee@vetclinic.test', name: 'Dr. Lee Chen', role: 'vet', phone: '+1 555 0202', password: 'x-rays before lunch, always' },
  { email: 'admin@vetclinic.test', name: 'Alex Morgan', role: 'admin', phone: '+1 555 0301', password: 'the front desk keeps the keys' },
];

const PETS = [
  { owner: 'olivia@vetclinic.test', name: 'Biscuit', species: 'Dog', breed: 'Beagle', born_on: '2021-04-02' },
  { owner: 'olivia@vetclinic.test', name: 'Mango', species: 'Cat', breed: 'Tabby', born_on: '2019-08-15' },
  { owner: 'ben@vetclinic.test', name: 'Pepper', species: 'Rabbit', breed: 'Holland Lop', born_on: '2023-01-20' },
];

const APPOINTMENTS = [
  { pet: 'Biscuit', vet: 'sam@vetclinic.test', starts_at: '2026-11-12 10:00', reason: 'Yearly check-up and vaccines' },
  { pet: 'Mango', vet: 'sam@vetclinic.test', starts_at: '2026-11-19 14:30', reason: 'Dental cleaning' },
  { pet: 'Pepper', vet: 'lee@vetclinic.test', starts_at: '2026-11-14 09:15', reason: 'Nail trim and weight check' },
];

export async function seedDatabase(db, { now = Date.now() } = {}) {
  const userIds = {};
  for (const u of SEED_USERS) {
    const user = createUser(db, { ...u, passwordHash: await hashPassword(u.password), now });
    userIds[u.email] = user.id;
  }
  const addPet = db.prepare('INSERT INTO pets (owner_id, name, species, breed, born_on) VALUES (?, ?, ?, ?, ?)');
  const petIds = {};
  for (const p of PETS) {
    petIds[p.name] = Number(addPet.run(userIds[p.owner], p.name, p.species, p.breed, p.born_on).lastInsertRowid);
  }
  const addAppointment = db.prepare('INSERT INTO appointments (pet_id, vet_id, starts_at, reason) VALUES (?, ?, ?, ?)');
  for (const a of APPOINTMENTS) addAppointment.run(petIds[a.pet], userIds[a.vet], a.starts_at, a.reason);
}

// Runs only when you call `node src/db/seed.js` directly, not when a test imports this file.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { databaseFile } = loadConfig();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(databaseFile + suffix, { force: true });
  const db = openDatabase(databaseFile);
  await seedDatabase(db);
  db.close();
  console.log(`Seeded ${SEED_USERS.length} users, ${PETS.length} pets and ${APPOINTMENTS.length} appointments into ${databaseFile}`);
}
