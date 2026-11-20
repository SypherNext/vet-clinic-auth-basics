// Passkeys, with a software authenticator playing the part of the phone.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users } from './helpers.js';
import { createSoftAuthenticator } from './soft-authenticator.js';

describe('passkeys', () => {
  let app;
  let device;
  beforeEach(async () => {
    app = await startTestApp();
    device = createSoftAuthenticator({ origin: app.baseUrl, rpID: app.config.passkeys.rpID });
  });
  afterEach(() => app.close());

  async function addPasskeyForOlivia() {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    await browser.get('/account');
    const options = JSON.parse((await browser.postJson('/account/passkeys/options')).text);
    const added = await browser.postJson('/account/passkeys/verify', { response: device.register(options), name: 'Test phone' });
    assert.equal(added.status, 200, added.text);
  }

  async function logInWithPasskey(browser, answer = device.logIn) {
    await browser.get('/login/passkey');
    const options = JSON.parse((await browser.postJson('/login/passkey/options')).text);
    return browser.postJson('/login/passkey/verify', { response: answer(options) });
  }

  it('adds a passkey and logs in with it, without a password', async () => {
    await addPasskeyForOlivia();
    const browser = app.newBrowser();
    const response = await logInWithPasskey(browser);
    assert.deepEqual(JSON.parse(response.text), { redirectTo: '/pets' });
    assert.equal((await browser.get('/pets')).status, 200);
  });

  it('refuses an answer signed for another challenge (a replay)', async () => {
    await addPasskeyForOlivia();
    const oldAnswer = device.logIn({ challenge: 'an-old-challenge-from-yesterday' });
    const response = await logInWithPasskey(app.newBrowser(), () => oldAnswer);
    assert.equal(response.status, 400);
  });

  it('refuses a passkey made for a different website', async () => {
    await addPasskeyForOlivia();
    const phishingDevice = createSoftAuthenticator({ origin: 'https://vet-clinic-login.example', rpID: 'vet-clinic-login.example' });
    const browser = app.newBrowser();
    await browser.logIn(users.ben);
    await browser.get('/account');
    const options = JSON.parse((await browser.postJson('/account/passkeys/options')).text);
    const response = await browser.postJson('/account/passkeys/verify', { response: phishingDevice.register(options) });
    assert.equal(response.status, 400);
  });
});
