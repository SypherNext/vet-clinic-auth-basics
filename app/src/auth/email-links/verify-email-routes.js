// Confirming an email address: the user clicks the link we emailed them.
import express from 'express';
import { markEmailVerified } from '../../users/users.js';
import { setFlash } from '../../sessions/sessions.js';
import { requireLogin } from '../../access/require.js';
import { rateLimit } from '../../security/rate-limit.js';
import { recordAuthEvent } from '../../audit/auth-events.js';
import { sendError } from '../../http/errors.js';
import { sendEmailLink, peekEmailLink, useEmailLink, EMAIL_LINK, BAD_LINK_MESSAGE } from './email-links.js';

export function verifyEmailRoutes(deps) {
  const router = express.Router();
  const limitPerUser = rateLimit(deps.rateLimiters.sendMessage, (req) => `user:${req.user.id}`);

  // The link opens a page with a button instead of verifying straight away.
  // Email security scanners open links by themselves, so a GET changes nothing.
  router.get('/verify-email', (req, res) => {
    const user = peekEmailLink(deps, req.query.token, EMAIL_LINK.verifyEmail);
    if (!user) return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);
    res.render('confirm-link', {
      title: 'Confirm your email',
      intro: `Confirm that ${user.email} belongs to you.`,
      action: '/verify-email',
      token: req.query.token,
      button: 'Confirm my email',
    });
  });

  router.post('/verify-email', (req, res) => {
    const user = useEmailLink(deps, req.body.token, EMAIL_LINK.verifyEmail);
    if (!user) return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);
    markEmailVerified(deps.db, user.id, deps.clock.now());
    recordAuthEvent(deps, req, { userId: user.id, event: 'email_verified' });
    setFlash(deps, req, res, 'Thank you. Your email address is confirmed.');
    res.redirect(req.user ? '/account' : '/login');
  });

  router.post('/account/verify-email/resend', requireLogin, limitPerUser, async (req, res) => {
    await sendEmailLink(deps, req.user, EMAIL_LINK.verifyEmail);
    setFlash(deps, req, res, `We sent a new link to ${req.user.email}.`);
    res.redirect('/account');
  });

  return router;
}
