// A tiny JSON API for scripts, such as a reception desk tool that prints the
// day's appointments. It uses HTTP Basic Auth instead of the login cookie.
import express from 'express';
import { basicAuth } from '../auth/basic-auth/basic-auth.js';
import { appointmentsForUser } from '../portal/portal-data.js';

export function apiRoutes(deps) {
  const router = express.Router();
  router.use(basicAuth(deps));

  router.get('/appointments', (req, res) => {
    res.json({ user: req.user.email, appointments: appointmentsForUser(deps.db, req.user) });
  });

  return router;
}
