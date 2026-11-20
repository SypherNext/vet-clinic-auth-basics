// The rules for a new password, following NIST SP 800-63B-4:
//   - long enough (15+ characters when the password is the only factor)
//   - not on a list of common or leaked passwords
//   - not built from the user's own email or the site's name
//   - no "must contain a symbol" rules and no forced changes every 90 days:
//     they make people pick worse passwords, not better ones
import fs from 'node:fs';
import path from 'node:path';
import { CLINIC_NAME } from '../../config.js';

const COMMON_PASSWORDS = new Set(
  fs.readFileSync(path.join(import.meta.dirname, 'common-passwords.txt'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#')),
);

const SITE_WORDS = ['vetclinic', CLINIC_NAME.toLowerCase().replaceAll(' ', '')];
const MIN_PERSONAL_PART = 4; // ignore very short email names like "jo"

// Returns a message explaining what is wrong, or null if the password is fine.
export function problemWithNewPassword(password, { minLength, maxLength }, { email }) {
  if (password.length < minLength) {
    return `Use at least ${minLength} characters. A short sentence that only you would write works well.`;
  }
  if (password.length > maxLength) return `Use at most ${maxLength} characters.`;

  const lower = password.toLowerCase();
  const squashed = lower.replaceAll(' ', '');
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(squashed)) {
    return 'That password is on a list of common passwords. Pick something less predictable.';
  }
  const emailName = email.split('@')[0];
  const personalWords = emailName.length >= MIN_PERSONAL_PART ? [emailName, ...SITE_WORDS] : SITE_WORDS;
  if (personalWords.some((word) => squashed.includes(word))) {
    return "Do not build your password from your email address or the clinic's name.";
  }
  return null;
}
