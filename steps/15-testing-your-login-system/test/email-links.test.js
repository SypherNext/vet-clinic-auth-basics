// Links sent by email: password reset and magic links.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users, lastEmailTo, linkPathIn, tokenIn, MINUTE } from './helpers.js';

describe('email links', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  async function askForResetLink(browser, email) {
    await browser.get('/forgot-password');
    return browser.post('/forgot-password', { email });
  }

  it('resets a password once, and logs out every other session', async () => {
    const laptop = app.newBrowser();
    await laptop.logIn(users.olivia);

    const phone = app.newBrowser();
    await askForResetLink(phone, users.olivia.email);
    const email = lastEmailTo(app.mailer, users.olivia.email);
    await phone.get(linkPathIn(email));
    const reset = await phone.post('/reset-password', { token: tokenIn(email), new_password: 'a brand new sentence about my dogs' });
    assert.equal(reset.location, '/login');

    assert.equal((await laptop.get('/pets')).location, '/login', 'the laptop was logged out');
    const again = await phone.post('/reset-password', { token: tokenIn(email), new_password: 'another new sentence about my cat' });
    assert.equal(again.status, 400, 'the link works only once');
    assert.equal((await phone.logIn({ ...users.olivia, password: 'a brand new sentence about my dogs' })).status, 302);
  });

  it('refuses a reset link after 30 minutes', async () => {
    const browser = app.newBrowser();
    await askForResetLink(browser, users.olivia.email);
    app.clock.advance(31 * MINUTE);
    const response = await browser.get(linkPathIn(lastEmailTo(app.mailer, users.olivia.email)));
    assert.equal(response.status, 400);
    assert.match(response.text, /expired or has already been used/);
  });

  it('answers the same for an unknown email and sends nothing', async () => {
    const browser = app.newBrowser();
    const known = await askForResetLink(browser, users.olivia.email);
    const unknown = await askForResetLink(browser, 'nobody@vetclinic.test');
    assert.equal(known.text.match(/<p class="ok">([^<]+)/)[1], unknown.text.match(/<p class="ok">([^<]+)/)[1]);
    assert.equal(lastEmailTo(app.mailer, 'nobody@vetclinic.test'), null);
  });

  it('logs in with a magic link, but only when the button is pressed', async () => {
    const browser = app.newBrowser();
    await browser.get('/login/magic-link');
    await browser.post('/login/magic-link', { email: users.ben.email });
    const email = lastEmailTo(app.mailer, users.ben.email);

    // An email scanner opening the link twice must not use it up.
    await app.newBrowser().get(linkPathIn(email));
    const page = await browser.get(linkPathIn(email));
    assert.match(page.text, /Log in as Ben Okafor/);

    const login = await browser.post('/login/magic-link/open', { token: tokenIn(email) });
    assert.equal(login.location, '/pets');
    assert.equal((await browser.get('/pets')).status, 200);
  });
});
