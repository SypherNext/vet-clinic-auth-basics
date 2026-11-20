// One-time codes by email and by (simulated) text message.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users, lastEmailTo, codeIn, MINUTE } from './helpers.js';

describe('login codes', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  async function askForCode(browser, email, channel) {
    await browser.get('/login/code');
    return browser.post('/login/code', { email, channel });
  }

  it('logs in with a code sent by email', async () => {
    const browser = app.newBrowser();
    await askForCode(browser, users.olivia.email, 'email');
    const code = codeIn(lastEmailTo(app.mailer, users.olivia.email).text);
    const response = await browser.post('/login/code/enter', { code });
    assert.equal(response.location, '/pets');
  });

  it('puts a text message in the simulated SMS outbox', async () => {
    const browser = app.newBrowser();
    await askForCode(browser, users.sam.email, 'sms');
    const [message] = app.sms.latest(1);
    assert.equal(message.to_phone, users.sam.phone);
    const response = await browser.post('/login/code/enter', { code: codeIn(message.body) });
    assert.equal(response.location, '/patients');
  });

  it('kills a code after 5 wrong tries, even if the right code comes next', async () => {
    const browser = app.newBrowser();
    await askForCode(browser, users.olivia.email, 'email');
    const code = codeIn(lastEmailTo(app.mailer, users.olivia.email).text);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await browser.post('/login/code/enter', { code: wrong });
    const response = await browser.post('/login/code/enter', { code });
    assert.equal(response.status, 401);
    assert.match(response.text, /expired or has had too many tries/);
  });

  it('refuses a code after 10 minutes', async () => {
    const browser = app.newBrowser();
    await askForCode(browser, users.olivia.email, 'email');
    const code = codeIn(lastEmailTo(app.mailer, users.olivia.email).text);
    app.clock.advance(10 * MINUTE + 1);
    const response = await browser.post('/login/code/enter', { code });
    assert.equal(response.status, 401);
  });
});
