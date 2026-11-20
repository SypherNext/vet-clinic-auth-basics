// Two-step login with an authenticator app. The test plays the phone app's
// part with currentTotpCode(), using the same secret and the fake clock.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users } from './helpers.js';
import { currentTotpCode } from '../src/auth/authenticator-app/totp.js';
import { findUserByEmail } from '../src/users/users.js';

describe('two-step login', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  // Turns the authenticator app on for Olivia; returns her secret and recovery codes.
  async function turnOnAuthenticatorApp() {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    const setup = await browser.get('/account/two-step');
    const secret = setup.text.match(/<code>([A-Z2-7 ]+)<\/code>/)[1].replaceAll(' ', '');
    const code = currentTotpCode(secret, app.clock.now(), app.config.authenticatorApp);
    const done = await browser.post('/account/two-step/enable', { code });
    const recoveryCodes = [...done.text.matchAll(/<li>([a-z0-9]{5}-[a-z0-9]{5})<\/li>/g)].map((m) => m[1]);
    await browser.post('/logout');
    return { secret, recoveryCodes };
  }

  it('asks for a code after the password, and refuses a reused code', async () => {
    const { secret } = await turnOnAuthenticatorApp();
    assert.notEqual(findUserByEmail(app.db, users.olivia.email).totp_enabled_at, null);
    app.clock.advance(60_000); // a fresh 30-second step

    const browser = app.newBrowser();
    const afterPassword = await browser.logIn(users.olivia);
    assert.equal(afterPassword.location, '/login/two-step');
    assert.equal((await browser.get('/pets')).location, '/login', 'not logged in yet');

    const code = currentTotpCode(secret, app.clock.now(), app.config.authenticatorApp);
    assert.equal((await browser.post('/login/two-step', { code })).location, '/pets');

    // Someone who watched Olivia type the code tries it straight away.
    const watcher = app.newBrowser();
    await watcher.logIn(users.olivia);
    assert.equal((await watcher.post('/login/two-step', { code })).status, 401);
  });

  it('accepts each recovery code once', async () => {
    const { recoveryCodes } = await turnOnAuthenticatorApp();
    assert.equal(recoveryCodes.length, 10);

    const first = app.newBrowser();
    await first.logIn(users.olivia);
    assert.equal((await first.post('/login/two-step', { recovery_code: recoveryCodes[0] })).location, '/pets');

    const second = app.newBrowser();
    await second.logIn(users.olivia);
    assert.equal((await second.post('/login/two-step', { recovery_code: recoveryCodes[0] })).status, 401);
  });

  it('starts over after 5 wrong codes', async () => {
    await turnOnAuthenticatorApp();
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    let response;
    for (let i = 0; i < 5; i++) response = await browser.post('/login/two-step', { code: '000000' });
    assert.equal(response.location, '/login');
  });
});
