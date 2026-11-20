// Passkey pages and the JSON endpoints that public/passkeys.js calls.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../../http/validate.js';
import { setFlash } from '../../sessions/sessions.js';
import { requireLogin } from '../../access/require.js';
import { limitAttempts } from '../../security/rate-limit.js';
import { recordAuthEvent } from '../../audit/auth-events.js';
import { finishLogin } from '../login-flow.js';
import { LOGIN_METHODS } from '../login-methods.js';
import { deletePasskey } from './passkey-store.js';
import { registrationOptions, verifyRegistration, authenticationOptions, verifyAuthentication } from './passkeys.js';

const MAX_NAME_LENGTH = 40;

// The folder holding @simplewebauthn/browser's ready-made browser script.
export const PASSKEY_BROWSER_SCRIPT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.resolve('@simplewebauthn/browser'))), '..', 'dist', 'bundle',
);

export function passkeyRoutes(deps) {
  const router = express.Router();

  // ----- Adding and removing passkeys (account page) -----

  router.post('/account/passkeys/options', requireLogin, async (req, res) => {
    res.json(await registrationOptions(deps, req, req.user));
  });

  router.post('/account/passkeys/verify', requireLogin, async (req, res) => {
    const name = readText(req.body.name, { maxLength: MAX_NAME_LENGTH }) ?? 'My passkey';
    await verifyRegistration(deps, req, req.user, { response: req.body.response, name });
    recordAuthEvent(deps, req, { userId: req.user.id, event: 'passkey_added' });
    setFlash(deps, req, res, `Passkey "${name}" added. You can now log in with it.`);
    res.json({ redirectTo: '/account' });
  });

  router.post('/account/passkeys/:id/delete', requireLogin, (req, res) => {
    if (deletePasskey(deps.db, req.user.id, req.params.id)) {
      recordAuthEvent(deps, req, { userId: req.user.id, event: 'passkey_removed' });
      setFlash(deps, req, res, 'Passkey removed.');
    }
    res.redirect('/account');
  });

  // ----- Logging in -----

  router.get('/login/passkey', (req, res) => res.render('passkey-login'));

  router.post('/login/passkey/options', limitAttempts(deps.rateLimiters), async (req, res) => {
    res.json(await authenticationOptions(deps, req));
  });

  router.post('/login/passkey/verify', limitAttempts(deps.rateLimiters), async (req, res) => {
    const user = await verifyAuthentication(deps, req, req.body.response);
    res.json({ redirectTo: finishLogin(deps, req, res, user, LOGIN_METHODS.passkey) });
  });

  return router;
}
