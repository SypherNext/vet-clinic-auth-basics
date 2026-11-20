// Magic links: type your email, get a link, click it, you are logged in.
// Being able to read the inbox is the proof of who you are, so no password is needed.
import express from 'express';
import { readEmail } from '../../http/validate.js';
import { findUserByEmail, markEmailVerified } from '../../users/users.js';
import { limitMessageSending } from '../../security/rate-limit.js';
import { sendError } from '../../http/errors.js';
import { finishLogin } from '../login-flow.js';
import { LOGIN_METHODS } from '../login-methods.js';
import { sendEmailLink, peekEmailLink, useEmailLink, EMAIL_LINK, BAD_LINK_MESSAGE } from '../email-links/email-links.js';

export function magicLinkRoutes(deps) {
  const { db, clock, rateLimiters } = deps;
  const router = express.Router();

  router.get('/login/magic-link', (req, res) => res.render('magic-link-start'));

  router.post('/login/magic-link', limitMessageSending(rateLimiters), async (req, res) => {
    const user = findUserByEmail(db, readEmail(req.body.email));
    if (user) await sendEmailLink(deps, user, EMAIL_LINK.magicLink);
    // The same answer whether or not the account exists.
    res.render('message', {
      title: 'Check your email',
      message: 'If an account uses that address, we have sent it a login link. It works once.',
      tone: 'ok',
    });
  });

  // Opening the link shows a button; only pressing it logs you in. Email
  // scanners that open links by themselves therefore cannot use the link up.
  router.get('/login/magic-link/open', (req, res) => {
    const user = peekEmailLink(deps, req.query.token, EMAIL_LINK.magicLink);
    if (!user) return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);
    res.render('confirm-link', {
      title: 'Log in with your link',
      intro: `You are about to log in as ${user.name} (${user.email}).`,
      action: '/login/magic-link/open',
      token: req.query.token,
      button: `Log in as ${user.name}`,
    });
  });

  router.post('/login/magic-link/open', (req, res) => {
    const user = useEmailLink(deps, req.body.token, EMAIL_LINK.magicLink);
    if (!user) return sendError(req, res, 400, 'Link not valid', BAD_LINK_MESSAGE);
    markEmailVerified(db, user.id, clock.now());
    res.redirect(finishLogin(deps, req, res, user, LOGIN_METHODS.magicLink));
  });

  return router;
}
