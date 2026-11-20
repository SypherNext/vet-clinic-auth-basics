// "Forgot your password?": email a reset link, then let the user pick a new password.
import express from 'express';
import { readEmail, readPassword } from '../../http/validate.js';
import { findUserByEmail, markEmailVerified } from '../../users/users.js';
import { setFlash } from '../../sessions/sessions.js';
import { limitMessageSending } from '../../security/rate-limit.js';
import { sendError } from '../../http/errors.js';
import { problemWithNewPassword } from '../passwords/password-policy.js';
import { setNewPassword } from '../passwords/password-service.js';
import { sendEmailLink, peekEmailLink, useEmailLink, EMAIL_LINK, BAD_LINK_MESSAGE } from './email-links.js';

export function passwordResetRoutes(deps) {
  const { db, config, clock, rateLimiters } = deps;
  const router = express.Router();

  router.get('/forgot-password', (req, res) => res.render('forgot-password'));

  router.post('/forgot-password', limitMessageSending(rateLimiters), async (req, res) => {
    const user = findUserByEmail(db, readEmail(req.body.email));
    if (user) await sendEmailLink(deps, user, EMAIL_LINK.resetPassword);
    // The same answer whether or not the account exists.
    res.render('message', {
      title: 'Check your email',
      message: 'If an account uses that address, we have sent it a link to reset the password.',
      tone: 'ok',
    });
  });

  const showResetForm = (res, token, error = null) =>
    res.status(error ? 400 : 200).render('reset-password', { token, error, minLength: config.passwords.minLength });

  router.get('/reset-password', (req, res) => {
    if (!peekEmailLink(deps, req.query.token, EMAIL_LINK.resetPassword)) {
      return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);
    }
    showResetForm(res, req.query.token);
  });

  router.post('/reset-password', async (req, res) => {
    const { token } = req.body;
    const owner = peekEmailLink(deps, token, EMAIL_LINK.resetPassword);
    if (!owner) return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);

    // Check the new password before using the link up, so a typo does not waste the link.
    const password = readPassword(req.body.new_password, config.passwords);
    const problem = password ? problemWithNewPassword(password, config.passwords, owner) : 'Please choose a password.';
    if (problem) return showResetForm(res, token, problem);

    const user = useEmailLink(deps, token, EMAIL_LINK.resetPassword);
    if (!user) return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);
    await setNewPassword(deps, req, user, password, { event: 'password_reset' });
    // Opening the link proved the user can read this inbox.
    markEmailVerified(db, user.id, clock.now());
    setFlash(deps, req, res, 'Your password has been changed. Log in with your new password.');
    res.redirect('/login');
  });

  return router;
}
