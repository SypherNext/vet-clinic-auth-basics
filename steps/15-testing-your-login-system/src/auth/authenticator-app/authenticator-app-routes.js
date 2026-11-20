// Two-step login with an authenticator app: turning it on and off from the
// account page, and the second step of the login itself.
import express from 'express';
import { readDigits } from '../../http/validate.js';
import { enableAuthenticatorApp, disableAuthenticatorApp, setTotpLastStep } from '../../users/users.js';
import { updateSessionData, setFlash } from '../../sessions/sessions.js';
import { requireLogin } from '../../access/require.js';
import { limitAttempts } from '../../security/rate-limit.js';
import { recordAuthEvent } from '../../audit/auth-events.js';
import { completeLogin, pendingLogin, TWO_STEP_PATH } from '../login-flow.js';
import { newTotpSecret, setupDetails, checkTotpCode } from './totp.js';
import { createRecoveryCodes, countUnusedRecoveryCodes, deleteRecoveryCodes } from './recovery-codes.js';
import { checkSecondStep } from './authenticator-app.js';

const SETUP_PATH = '/account/two-step';

export function authenticatorAppRoutes(deps) {
  const { db, config, clock, rateLimiters } = deps;
  const settings = config.authenticatorApp;
  const router = express.Router();

  // ----- Turning it on -----

  // The new secret waits in the session until the user proves their app
  // works by typing a code. Only then is it saved on the account.
  const showSetup = async (req, res, error = null) => {
    if (req.user.totp_enabled_at !== null) {
      return res.render('two-step-status', { unusedCodes: countUnusedRecoveryCodes(db, req.user.id), error });
    }
    let secret = req.session.data.totpSetupSecret;
    if (!secret) {
      secret = newTotpSecret();
      updateSessionData(deps, req, { totpSetupSecret: secret });
    }
    res.status(error ? 400 : 200).render('two-step-setup', { ...(await setupDetails(secret, req.user.email, settings)), error });
  };

  router.get(SETUP_PATH, requireLogin, (req, res) => showSetup(req, res));

  router.post(`${SETUP_PATH}/enable`, requireLogin, limitAttempts(rateLimiters), async (req, res) => {
    const secret = req.session.data.totpSetupSecret;
    if (!secret || req.user.totp_enabled_at !== null) return res.redirect(SETUP_PATH);
    const code = readDigits(req.body.code, { length: settings.digits });
    const step = code && checkTotpCode({ secret, code, lastStep: null, now: clock.now(), settings });
    if (!step) return showSetup(req, res, 'That code did not match. Check the time on your phone and try the newest code.');

    enableAuthenticatorApp(db, req.user.id, { secret, now: clock.now() });
    setTotpLastStep(db, req.user.id, step);
    updateSessionData(deps, req, { totpSetupSecret: undefined });
    recordAuthEvent(deps, req, { userId: req.user.id, event: 'authenticator_app_enabled' });
    const codes = createRecoveryCodes(db, req.user.id, settings.recoveryCodeCount);
    res.render('recovery-codes', { codes });
  });

  // Turning it off needs a current code, so a borrowed laptop is not enough.
  router.post(`${SETUP_PATH}/disable`, requireLogin, limitAttempts(rateLimiters), async (req, res) => {
    const check = checkSecondStep(deps, req.user, { code: req.body.code, recoveryCode: req.body.recovery_code });
    if (!check.ok) return showSetup(req, res, 'That code did not match, so two-step login is still on.');
    disableAuthenticatorApp(db, req.user.id);
    deleteRecoveryCodes(db, req.user.id);
    recordAuthEvent(deps, req, { userId: req.user.id, event: 'authenticator_app_disabled' });
    setFlash(deps, req, res, 'Two-step login is now off.');
    res.redirect('/account');
  });

  // ----- The second step of a login -----

  const showLoginStep = (res, error = null) =>
    res.status(error ? 401 : 200).render('two-step-login', { error, digits: settings.digits });

  router.get(TWO_STEP_PATH, (req, res) => {
    if (!pendingLogin(deps, req)) return res.redirect('/login');
    showLoginStep(res);
  });

  router.post(TWO_STEP_PATH, limitAttempts(rateLimiters), (req, res) => {
    const pending = pendingLogin(deps, req);
    if (!pending) return res.redirect('/login');

    const check = checkSecondStep(deps, pending.user, { code: req.body.code, recoveryCode: req.body.recovery_code });
    if (!check.ok) {
      const attempts = (req.session.data.twoStepAttempts ?? 0) + 1;
      if (attempts >= settings.maxAttempts) {
        updateSessionData(deps, req, { pendingLogin: undefined, twoStepAttempts: undefined });
        setFlash(deps, req, res, 'Too many wrong codes. Please log in again.', 'error');
        return res.redirect('/login');
      }
      updateSessionData(deps, req, { twoStepAttempts: attempts });
      return showLoginStep(res, 'That code is not right. Use the newest code from your app.');
    }

    if (check.usedRecoveryCode) recordAuthEvent(deps, req, { userId: pending.user.id, event: 'recovery_code_used' });
    // completeLogin() starts a brand new session, which also clears the
    // pending login and the attempt counter.
    res.redirect(completeLogin(deps, req, res, pending.user, `${pending.methodId}+authenticator_app`));
  });

  return router;
}
