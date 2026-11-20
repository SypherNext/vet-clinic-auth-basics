// The words in every email and text message the portal sends. Each email
// function returns { subject, text } and never includes anything secret
// except the one link or code the message exists to deliver.
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

export function loginCodeMessage({ name, code, lifetimeMs }) {
  return {
    subject: `Your login code: ${code}`,
    text: `Hello ${name},\n\nYour clinic portal login code is:\n\n${code}\n\n`
      + `It expires in ${formatDuration(lifetimeMs)}. Clinic staff will never ask you for this code.${SIGN_OFF}`,
  };
}

export function loginCodeTextMessage({ code, lifetimeMs }) {
  return `${code} is your ${CLINIC_NAME} login code. It expires in ${formatDuration(lifetimeMs)}. Never share it.`;
}
