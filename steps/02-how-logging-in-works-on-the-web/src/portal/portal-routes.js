// The clinic pages: a pet owner's pets, a vet's patients, the admin's user list.
// Handlers stay thin: they pick the data and the page, nothing else.
import express from 'express';
import { petsForOwner, patientsForVet } from './portal-data.js';
import { listUsers } from '../users/users.js';
import { requireLogin } from '../access/require.js';

export function portalRoutes(deps) {
  const { db } = deps;
  const router = express.Router();

  router.get('/', (req, res) => res.render('home'));

  router.get('/pets', requireLogin, (req, res) => {
    res.render('pets', { pets: petsForOwner(db, req.user.id) });
  });

  router.get('/patients', requireLogin, (req, res) => {
    res.render('patients', { patients: patientsForVet(db, req.user.id) });
  });

  router.get('/admin/users', requireLogin, (req, res) => {
    res.render('admin-users', { users: listUsers(db) });
  });

  return router;
}
