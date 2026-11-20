// Logging in with a one-time code: ask for a code, then type it in.
import express from 'express';
import { readEmail, readDigits } from '../../http/validate.js';
import { findActiveUserByEmail, findActiveUserById, markEmailVerified } from '../../users/users.js';
import { ensureSession, updateSessionData } from '../../sessions/sessions.js';
import { limitAttempts, limitMessageSending } from '../../security/rate-limit.js';
import { plural } from '../../format.js';
import { finishLogin } from '../login-flow.js';
import { LOGIN_METHODS } from '../login-methods.js';
import { CODE_CHANNELS, canReceive, sendLoginCode, checkLoginCode } from './login-codes.js';

const ENTER_CODE_PATH = '/login/code/enter';

export function loginCodeRoutes(deps) {
  const { db, clock, config, rateLimiters } = deps;
  const router = express.Router();
  const channels = Object.values(CODE_CHANNELS);

  router.get('/login/code', (req, res) => res.render('login-code-start', { channels, error: null }));

  router.post('/login/code', limitMessageSending(rateLimiters), async (req, res) => {
    const email = readEmail(req.body.email);
    const channel = CODE_CHANNELS[req.body.channel];
    if (!email || !channel) {
      return res.status(400).render('login-code-start', { channels, error: 'Enter your email and pick where to send the code.' });
    }
    const user = findActiveUserByEmail(db, email);
    if (user && canReceive(user, channel.id)) await sendLoginCode(deps, user, channel.id);
    // Remember who asked, on the server side. We move on to the next page
    // even when there is no account, so the page does not reveal that.
    ensureSession(deps, req, res);
    updateSessionData(deps, req, { loginCode: { userId: user?.id ?? null, email, channel: channel.id } });
    res.redirect(ENTER_CODE_PATH);
  });

  const showEnterForm = (req, res, error = null) => {
    const pending = req.session?.data.loginCode;
    if (!pending) return res.redirect('/login/code');
    res.status(error ? 401 : 200).render('login-code-enter', {
      email: pending.email,
      channel: CODE_CHANNELS[pending.channel],
      digits: config.loginCodes.digits,
      error,
    });
  };

  router.get(ENTER_CODE_PATH, (req, res) => showEnterForm(req, res));

  router.post(ENTER_CODE_PATH, limitAttempts(rateLimiters), (req, res) => {
    const pending = req.session?.data.loginCode;
    if (!pending) return res.redirect('/login/code');
    const code = readDigits(req.body.code, { length: config.loginCodes.digits });
    if (!code) return showEnterForm(req, res, `Enter the ${config.loginCodes.digits}-digit code.`);
    if (!pending.userId) return showEnterForm(req, res, 'That code is not right.');

    const result = checkLoginCode(deps, pending.userId, code);
    if (result.failure === 'expired') {
      return showEnterForm(req, res, 'This code has expired or has had too many tries. Ask for a new code.');
    }
    if (result.failure === 'wrong') {
      return showEnterForm(req, res, `That code is not right. ${plural(result.triesLeft, 'try', 'tries')} left.`);
    }

    const user = findActiveUserById(db, pending.userId);
    updateSessionData(deps, req, { loginCode: undefined });
    if (!user) return res.redirect('/login/code');
    // A code that arrived by email proves the user can read that inbox.
    if (result.channel === CODE_CHANNELS.email.id) markEmailVerified(db, user.id, clock.now());
    res.redirect(finishLogin(deps, req, res, user, LOGIN_METHODS.loginCode));
  });

  return router;
}
