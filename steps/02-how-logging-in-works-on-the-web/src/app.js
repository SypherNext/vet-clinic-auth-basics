// Builds the Express app from its parts. server.js starts it; tests can build
// their own copy with a different database.
import express from 'express';
import path from 'node:path';
import { claimedIdentity } from './auth/claimed-identity.js';
import { portalRoutes } from './portal/portal-routes.js';
import { notFound, errorHandler } from './http/errors.js';

export function createApp(deps) {
  const app = express();
  app.set('views', path.join(import.meta.dirname, 'views'));
  app.set('view engine', 'ejs');
  app.locals.clinicName = deps.config.clinicName;

  app.use(express.static(path.join(import.meta.dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  app.use(claimedIdentity(deps));
  app.use(portalRoutes(deps));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
