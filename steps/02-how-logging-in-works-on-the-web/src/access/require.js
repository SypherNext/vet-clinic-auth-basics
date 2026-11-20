// Gatekeepers for routes. Put one in front of a route to say who may use it.
import { sendError } from '../http/errors.js';

// The visitor must be someone the portal knows.
export function requireLogin(req, res, next) {
  if (req.user) return next();
  sendError(req, res, 401, 'Who are you?', 'This page shows private clinic data. Go to the start page and enter your email first.');
}
