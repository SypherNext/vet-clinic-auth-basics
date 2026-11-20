// Cross-site request forgery: a form without our token is refused.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users } from './helpers.js';

describe('CSRF protection', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  it('refuses a form posted without a token', async () => {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    const response = await browser.request('POST', '/account/sessions/logout-others', { form: {} });
    assert.equal(response.status, 403);
  });

  it('refuses a form with the wrong token', async () => {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    const response = await browser.request('POST', '/logout', { form: { _csrf: 'guessed-token' } });
    assert.equal(response.status, 403);
    assert.equal((await browser.get('/pets')).status, 200, 'still logged in');
  });

  it('refuses a form sent from another website', async () => {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    await browser.get('/account');
    const response = await browser.request('POST', '/logout', {
      form: { _csrf: browser.csrfToken },
      headers: { origin: 'https://evil.example' },
    });
    assert.equal(response.status, 403);
  });
});
