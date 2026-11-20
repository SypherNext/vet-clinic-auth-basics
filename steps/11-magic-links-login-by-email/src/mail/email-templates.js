// The words in every email the portal sends. Each email
// function returns { subject, text } and never includes anything secret
// except the one link the message exists to deliver.
import { CLINIC_NAME } from '../config.js';
import { formatDuration } from '../format.js';

const SIGN_OFF = `\n\n${CLINIC_NAME}\nIf you did not ask for this, you can ignore this email.`;

export function verifyEmailMessage({ name, link, lifetimeMs }) {
  return {
    subject: 'Confirm your email address',
    text: `Hello ${name},\n\nPlease confirm your email address for the clinic portal:\n\n${link}\n\n`
      + `The link works once and expires in ${formatDuration(lifetimeMs)}.${SIGN_OFF}`,
  };
}

export function resetPasswordMessage({ name, link, lifetimeMs }) {
  return {
    subject: 'Reset your password',
    text: `Hello ${name},\n\nSomeone asked to reset the password for your clinic portal account. `
      + `To choose a new password, open:\n\n${link}\n\n`
      + `The link works once and expires in ${formatDuration(lifetimeMs)}.${SIGN_OFF}`,
  };
}

export function magicLinkMessage({ name, link, lifetimeMs }) {
  return {
    subject: 'Your login link',
    text: `Hello ${name},\n\nOpen this link to log in to the clinic portal:\n\n${link}\n\n`
      + `The link works once and expires in ${formatDuration(lifetimeMs)}. `
      + `Never forward it: anyone with the link can log in as you.${SIGN_OFF}`,
  };
}
