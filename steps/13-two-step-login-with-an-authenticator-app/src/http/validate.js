// Turns raw form fields into clean values. Each function returns the cleaned
// value, or null when the input is not acceptable. Routes never trust a field
// they have not passed through one of these.

const MAX_EMAIL_LENGTH = 254;
// Deliberately simple: something@something.something, no spaces.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email)) return null;
  return email;
}

export function readText(value, { maxLength }) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length === 0 || text.length > maxLength) return null;
  return text;
}

// Passwords are never trimmed: a space at the end is part of the password.
export function readPassword(value, { maxLength }) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) return null;
  return value;
}

// "123 456" and "123456" are the same code. Anything else is rejected.
export function readDigits(value, { length }) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\s+/g, '');
  return digits.length === length && /^\d+$/.test(digits) ? digits : null;
}

// Phone numbers are optional on sign-up. Keep digits, spaces, + and -.
export function readPhone(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const phone = value.trim();
  return /^\+?[\d\s-]{7,20}$/.test(phone) ? phone : null;
}
