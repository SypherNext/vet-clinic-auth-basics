// Sending and using one-use links by email. Each kind of link is described
// once in EMAIL_LINK_KINDS: where it points, how long it lasts and which
// email template carries it. Adding a new kind of link means adding an entry.
import { createEmailToken, findUsableEmailToken, useEmailToken } from './email-token-store.js';
import { findActiveUserById } from '../../users/users.js';
import { verifyEmailMessage, resetPasswordMessage, magicLinkMessage } from '../../mail/email-templates.js';

export const EMAIL_LINK = {
  verifyEmail: 'verify_email',
  resetPassword: 'reset_password',
  magicLink: 'magic_link',
};

const EMAIL_LINK_KINDS = {
  [EMAIL_LINK.verifyEmail]: { path: '/verify-email', lifetime: 'verifyEmailMs', template: verifyEmailMessage },
  [EMAIL_LINK.resetPassword]: { path: '/reset-password', lifetime: 'resetPasswordMs', template: resetPasswordMessage },
  [EMAIL_LINK.magicLink]: { path: '/login/magic-link/open', lifetime: 'magicLinkMs', template: magicLinkMessage },
};

export const BAD_LINK_MESSAGE = 'This link has expired or has already been used. You can ask for a new one.';

export async function sendEmailLink(deps, user, purpose) {
  const kind = EMAIL_LINK_KINDS[purpose];
  const lifetimeMs = deps.config.emailLinks[kind.lifetime];
  const token = createEmailToken(deps.db, { userId: user.id, purpose, lifetimeMs, now: deps.clock.now() });
  const link = `${deps.config.appOrigin}${kind.path}?token=${token}`;
  await deps.mailer.send({ to: user.email, ...kind.template({ name: user.name, link, lifetimeMs }) });
}

// The user a link belongs to, without using the link up. null if the link is bad.
export function peekEmailLink(deps, token, purpose) {
  if (typeof token !== 'string') return null;
  const row = findUsableEmailToken(deps.db, { token, purpose, now: deps.clock.now() });
  return row ? findActiveUserById(deps.db, row.user_id) : null;
}

// Uses the link up and returns its user. null if the link is bad.
export function useEmailLink(deps, token, purpose) {
  if (typeof token !== 'string') return null;
  const userId = useEmailToken(deps.db, { token, purpose, now: deps.clock.now() });
  return userId ? findActiveUserById(deps.db, userId) : null;
}
