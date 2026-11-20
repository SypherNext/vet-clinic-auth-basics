// Builds the Express app from its parts. server.js starts it with the real
// database, mailer and clock; tests build their own copy with fakes.
//
// deps = { config, db, clock, mailer, sms }: everything the routes need,
// passed in rather than imported, so any part can be swapped in a test.
import express from 'express';
import path from 'node:path';
import { formatTime, plural } from './format.js';
import { notFound, errorHandler } from './http/errors.js';
import { securityHeaders } from './security/security-headers.js';
import { csrfProtection } from './security/csrf.js';
import { createRateLimiters } from './security/rate-limit.js';
import { sessionMiddleware, viewLocals } from './sessions/sessions.js';
import { sessionRoutes } from './sessions/session-routes.js';
import { apiRoutes } from './api/api-routes.js';
import { portalRoutes } from './portal/portal-routes.js';
import { accountRoutes } from './account/account-routes.js';
import { devRoutes } from './dev/dev-routes.js';
import { passwordRoutes } from './auth/passwords/password-routes.js';
import { verifyEmailRoutes } from './auth/email-links/verify-email-routes.js';
import { passwordResetRoutes } from './auth/email-links/password-reset-routes.js';
import { magicLinkRoutes } from './auth/magic-links/magic-link-routes.js';
import { loginCodeRoutes } from './auth/login-codes/login-code-routes.js';

// Every group of pages. Each one is a function that takes deps and returns a router.
const PAGE_ROUTES = [
  portalRoutes,
  sessionRoutes,
  passwordRoutes,
  verifyEmailRoutes,
  passwordResetRoutes,
  magicLinkRoutes,
  loginCodeRoutes,
  accountRoutes,
  devRoutes,
];

export function createApp(baseDeps) {
  const deps = { ...baseDeps, rateLimiters: createRateLimiters(baseDeps) };
  const app = express();
  app.set('views', path.join(import.meta.dirname, 'views'));
  app.set('view engine', 'ejs');
  app.disable('x-powered-by');
  app.locals.clinicName = deps.config.clinicName;
  app.locals.devTools = deps.config.devTools;
  app.locals.formatTime = formatTime;
  app.locals.plural = plural;
  // Defaults for every page; the session middleware fills in the real values.
  app.locals.user = null;
  app.locals.csrfToken = '';
  app.locals.flash = null;

  app.use(securityHeaders);
  app.use(express.static(path.join(import.meta.dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // The API checks a password on every request and uses no cookie, so it
  // needs neither a session nor a CSRF token. It is mounted before them.
  app.use('/api', apiRoutes(deps));

  app.use(sessionMiddleware(deps));
  app.use(csrfProtection(deps));
  app.use(viewLocals(deps));
  for (const routes of PAGE_ROUTES) app.use(routes(deps));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
