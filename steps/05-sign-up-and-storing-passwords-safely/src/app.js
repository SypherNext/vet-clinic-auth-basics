// Builds the Express app from its parts. server.js starts it with the real
// database; tests can build their own copy.
//
// deps = { config, db }: everything the routes need, passed in rather than
// imported, so any part can be swapped in a test.
import express from 'express';
import path from 'node:path';
import { notFound, errorHandler } from './http/errors.js';
import { portalRoutes } from './portal/portal-routes.js';
import { passwordRoutes } from './auth/passwords/password-routes.js';

// Every group of pages. Each one is a function that takes deps and returns a router.
const PAGE_ROUTES = [
  portalRoutes,
  passwordRoutes,
];

export function createApp(deps) {
  const app = express();
  app.set('views', path.join(import.meta.dirname, 'views'));
  app.set('view engine', 'ejs');
  app.disable('x-powered-by');
  app.locals.clinicName = deps.config.clinicName;
  // Nothing remembers who you are yet (that is lesson 6), so no page has a user.
  app.locals.user = null;

  app.use(express.static(path.join(import.meta.dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  for (const routes of PAGE_ROUTES) app.use(routes(deps));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
