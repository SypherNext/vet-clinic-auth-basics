// Time-based one-time passwords (TOTP), the 6-digit codes that authenticator
// apps show. The server and the app share one secret. Both feed the secret
// and the current 30-second time step into HMAC-SHA1, so both get the same
// code without ever talking to each other.
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const SECRET_BYTES = 20; // 160 bits, the size RFC 4226 recommends

export function newTotpSecret() {
  return new OTPAuth.Secret({ size: SECRET_BYTES }).base32;
}

function totpFor(secret, label, settings) {
  return new OTPAuth.TOTP({
    issuer: settings.issuer,
    label,
    algorithm: 'SHA1', // what every authenticator app supports
    digits: settings.digits,
    period: settings.periodSeconds,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

// What the setup page shows: a QR code to scan, and the same key as text.
export async function setupDetails(secret, email, settings) {
  const uri = totpFor(secret, email, settings).toString();
  return { uri, qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret };
}

// Returns the time step the code belongs to, or null if the code is wrong.
// A code from a step at or before lastStep was already used, so it is refused:
// someone who sees you type a code cannot use it again.
export function checkTotpCode({ secret, code, lastStep, now, settings }) {
  const totp = totpFor(secret, 'check', settings);
  const delta = totp.validate({ token: code, timestamp: now, window: settings.window });
  if (delta === null) return null;
  const step = Math.floor(now / 1000 / settings.periodSeconds) + delta;
  if (lastStep !== null && step <= lastStep) return null;
  return step;
}

// Used by tests and the course's demo script to play the part of the phone app.
export function currentTotpCode(secret, now, settings) {
  return totpFor(secret, 'demo', settings).generate({ timestamp: now });
}
