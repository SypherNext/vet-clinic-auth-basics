// Session cookies: their flags, fixation, logout, timeouts and roles.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users, MINUTE } from './helpers.js';

describe('sessions', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  it('sets an HttpOnly, SameSite=Lax session cookie at login', async () => {
    const browser = app.newBrowser();
    await browser.get('/login');
    const response = await browser.post('/login', { email: users.olivia.email, password: users.olivia.password });
    const cookie = response.headers.getSetCookie().find((c) => c.startsWith('session='));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });

  it('issues a new session id at login (no session fixation)', async () => {
    const browser = app.newBrowser();
    await browser.get('/login');
    const before = browser.cookies.get('session');
    await browser.post('/login', { email: users.olivia.email, password: users.olivia.password });
    const after = browser.cookies.get('session');
    assert.notEqual(before, after);

    // An attacker who planted the old id gets nothing from it.
    const attacker = app.newBrowser();
    attacker.cookies.set('session', before);
    const response = await attacker.get('/pets');
    assert.equal(response.status, 302);
    assert.equal(response.location, '/login');
  });

  it('ends the session on the server at logout', async () => {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    const stolenCopy = browser.cookies.get('session');
    await browser.get('/pets');
    await browser.post('/logout');

    const replay = app.newBrowser();
    replay.cookies.set('session', stolenCopy);
    assert.equal((await replay.get('/pets')).status, 302);
  });

  it('logs out after 30 idle minutes', async () => {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    app.clock.advance(29 * MINUTE);
    assert.equal((await browser.get('/pets')).status, 200);
    app.clock.advance(31 * MINUTE);
    assert.equal((await browser.get('/pets')).location, '/login');
  });

  it('answers 403 when a logged-in owner opens a vet page', async () => {
    const browser = app.newBrowser();
    await browser.logIn(users.olivia);
    assert.equal((await browser.get('/patients')).status, 403);
  });
});
