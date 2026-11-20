// The clinic pages: a pet owner's pets, a vet's patients, the admin's user list.
// Handlers stay thin: they check who may see the page, pick the data and the
// template, and nothing else.
import express from 'express';
import { petsForOwner, patientsForVet } from './portal-data.js';
import { listUsers } from '../users/users.js';
import { requireRole } from '../access/require.js';
import { homePathFor } from '../access/roles.js';
import { LOGIN_PAGE_METHODS } from '../auth/login-methods.js';

export function portalRoutes(deps) {
  const router = express.Router();

  router.get('/', (req, res) => {
    if (req.user) return res.redirect(homePathFor(req.user));
    res.render('home', { methods: LOGIN_PAGE_METHODS });
  });

  router.get('/pets', requireRole('owner'), (req, res) => {
    res.render('pets', { pets: petsForOwner(deps.db, req.user.id) });
  });

  router.get('/patients', requireRole('vet'), (req, res) => {
    res.render('patients', { patients: patientsForVet(deps.db, req.user.id) });
  });

  router.get('/admin/users', requireRole('admin'), (req, res) => {
    res.render('admin-users', { users: listUsers(deps.db) });
  });

  return router;
}
