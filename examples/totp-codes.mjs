// Shows how authenticator-app codes change every 30 seconds, using the app's
// own TOTP settings and a made-up secret. Both the phone and the server run
// this same calculation, which is why they agree without talking to each other.
// Run from the repo root: node examples/totp-codes.mjs   (install the app first)
import { currentTotpCode, checkTotpCode } from '../app/src/auth/authenticator-app/totp.js';
import { loadConfig } from '../app/src/config.js';

const settings = loadConfig().authenticatorApp;
const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'; // a demo secret, never use it for real
const start = Date.parse('2026-11-05T09:00:00Z');

console.log('time (UTC)  step       code');
for (const seconds of [0, 15, 29, 30, 59, 60, 90]) {
  const now = start + seconds * 1000;
  const step = Math.floor(now / 1000 / settings.periodSeconds);
  console.log(`${new Date(now).toISOString().slice(11, 19)}    ${step}   ${currentTotpCode(secret, now, settings)}`);
}

const code = currentTotpCode(secret, start, settings);
const accepted = checkTotpCode({ secret, code, lastStep: null, now: start + 20_000, settings });
const replay = checkTotpCode({ secret, code, lastStep: accepted, now: start + 25_000, settings });
const late = checkTotpCode({ secret, code, lastStep: null, now: start + 95_000, settings });
console.log(`\ncode ${code} typed 20 s later: accepted for step ${accepted}`);
console.log(`same code typed again:        ${replay === null ? 'refused (already used)' : 'accepted'}`);
console.log(`same code typed 95 s later:   ${late === null ? 'refused (too old)' : 'accepted'}`);
