// The rules for the authenticator-app second step, shared by the login page
// and the "turn it off" form.
import { setTotpLastStep } from '../../users/users.js';
import { readDigits } from '../../http/validate.js';
import { checkTotpCode } from './totp.js';
import { useRecoveryCode } from './recovery-codes.js';

// Checks either a 6-digit app code or a recovery code from the form.
// Returns { ok: true, usedRecoveryCode } or { ok: false }.
export function checkSecondStep(deps, user, { code, recoveryCode }) {
  const settings = deps.config.authenticatorApp;
  const now = deps.clock.now();

  const appCode = readDigits(code, { length: settings.digits });
  if (appCode) {
    const step = checkTotpCode({ secret: user.totp_secret, code: appCode, lastStep: user.totp_last_step, now, settings });
    if (step === null) return { ok: false };
    setTotpLastStep(deps.db, user.id, step);
    return { ok: true, usedRecoveryCode: false };
  }
  if (recoveryCode && useRecoveryCode(deps.db, user.id, recoveryCode, now)) {
    return { ok: true, usedRecoveryCode: true };
  }
  return { ok: false };
}
