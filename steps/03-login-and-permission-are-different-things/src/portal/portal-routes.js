// The clinic pages: a pet owner's pets, a vet's patients, the admin's user list.
// Handlers stay thin: they check who may see the page, pick the data and the
// template, and nothing else.
import express from 'express';
import { petsForOwner, patientsForVet } from './portal-data.js';
import { listUsers } from '../users/users.js';
import { requireRole } from '../access/require.js';

export function portalRoutes(deps) {
  const { db } = deps;
  const router = express.Router();

  router.get('/', (req, res) => res.render('home'));

  router.get('/pets', requireRole('owner'), (req, res) => {
    res.render('pets', { pets: petsForOwner(db, req.user.id) });
  });

  router.get('/patients', requireRole('vet'), (req, res) => {
    res.render('patients', { patients: patientsForVet(db, req.user.id) });
  });

  router.get('/admin/users', requireRole('admin'), (req, res) => {
    res.render('admin-users', { users: listUsers(db) });
  });

  return router;
}
