// The rules for one-time login codes: make one, send it, check it.
import { randomDigits } from '../../security/tokens.js';
import { loginCodeMessage, loginCodeTextMessage } from '../../mail/email-templates.js';
import {
  createLoginCode, findActiveLoginCode, codeMatches, recordWrongCode, markLoginCodeUsed,
} from './login-code-store.js';

export const CODE_CHANNELS = {
  email: { id: 'email', label: 'Email' },
  sms: { id: 'sms', label: 'Text message (simulated)' },
};

// A text message needs a phone number on the account.
export function canReceive(user, channelId) {
  return channelId === CODE_CHANNELS.email.id || Boolean(user.phone);
}

export async function sendLoginCode(deps, user, channelId) {
  const { digits, lifetimeMs } = deps.config.loginCodes;
  const code = randomDigits(digits);
  createLoginCode(deps.db, { userId: user.id, channel: channelId, code, lifetimeMs, now: deps.clock.now() });
  if (channelId === CODE_CHANNELS.sms.id) {
    await deps.sms.send({ to: user.phone, body: loginCodeTextMessage({ code, lifetimeMs }) });
  } else {
    await deps.mailer.send({ to: user.email, ...loginCodeMessage({ name: user.name, code, lifetimeMs }) });
  }
}

// Returns { ok: true, channel } or { failure: 'expired' | 'wrong', triesLeft }.
export function checkLoginCode(deps, userId, code) {
  const { maxAttempts } = deps.config.loginCodes;
  const now = deps.clock.now();
  const loginCode = findActiveLoginCode(deps.db, { userId, maxAttempts, now });
  if (!loginCode) return { failure: 'expired' };
  if (!codeMatches(loginCode, code)) {
    const used = recordWrongCode(deps.db, loginCode.id);
    return used >= maxAttempts ? { failure: 'expired' } : { failure: 'wrong', triesLeft: maxAttempts - used };
  }
  markLoginCodeUsed(deps.db, loginCode.id, now);
  return { ok: true, channel: loginCode.channel };
}
