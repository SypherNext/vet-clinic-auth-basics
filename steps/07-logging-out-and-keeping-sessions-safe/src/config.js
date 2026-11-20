// Every setting the app reads, in one place. Values come from environment
// variables (or a .env file), with defaults that work on your own computer.
// Time limits and attempt limits live here too, so there is exactly one
// place to look when you want to know "how long does a session last?".
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

export const CLINIC_NAME = 'Maple Street Vet Clinic';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 18820);
  const appOrigin = env.APP_ORIGIN ?? `http://localhost:${port}`;
  const production = env.NODE_ENV === 'production';
  // Secure cookies are only sent over HTTPS. Production always uses them.
  const secureCookies = production || env.COOKIE_SECURE === 'true';

  return {
    port,
    // 127.0.0.1 means "only this computer can connect".
    host: env.HOST ?? '127.0.0.1',
    // The address you type in the browser.
    appOrigin,
    production,
    databaseFile: env.DATABASE_FILE ?? path.join(root, 'data', 'vet-clinic.db'),
    clinicName: CLINIC_NAME,

    sessions: {
      // The __Host- prefix makes the browser refuse the cookie unless it is
      // Secure, has Path=/ and no Domain, so it needs HTTPS.
      cookieName: secureCookies ? '__Host-session' : 'session',
      secureCookies,
      // Log out after 30 minutes without a click...
      idleTimeoutMs: 30 * MINUTE,
      // ...and after 12 hours no matter what.
      absoluteTimeoutMs: 12 * HOUR,
    },

    passwords: {
      // NIST SP 800-63B-4: at least 15 characters when the password is the only factor.
      minLength: 15,
      maxLength: 128,
    },
  };
}
