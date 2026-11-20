// Gatekeepers for routes. Put one in front of a route to say who may use it.
//   requireLogin          anyone the portal knows
//   requireRole('vet')    only people with that role
import { sendError } from '../http/errors.js';

// 401: "we do not know who you are".
export function requireLogin(req, res, next) {
  if (req.user) return next();
  sendError(req, res, 401, 'Who are you?', 'This page shows private clinic data. Go to the start page and enter your email first.');
}

// 403: "we know who you are, and you may not do this".
export function requireRole(...roles) {
  return (req, res, next) => {
    requireLogin(req, res, () => {
      if (roles.includes(req.user.role)) return next();
      sendError(req, res, 403, 'Not allowed', `This page is only for: ${roles.join(', ')}.`);
    });
  };
}
