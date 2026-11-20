// Guessing passwords: the account locks, and each IP address is slowed down.
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users, MINUTE } from './helpers.js';

describe('lockout and rate limiting', () => {
  let app;
  afterEach(() => app.close());

  it('locks the account after 5 wrong passwords, then unlocks after 15 minutes', async () => {
    app = await startTestApp();
    const attacker = app.newBrowser();
    for (let i = 0; i < 5; i++) await attacker.logIn({ email: users.olivia.email, password: `guess number ${i} for olivia` });

    const olivia = app.newBrowser();
    const whileLocked = await olivia.logIn(users.olivia);
    assert.equal(whileLocked.status, 401);
    assert.match(whileLocked.text, /locked for 15 minutes/);

    app.clock.advance(15 * MINUTE + 1);
    const afterwards = await olivia.logIn(users.olivia);
    assert.equal(afterwards.status, 302);
  });

  it('answers 429 Too Many Requests when one IP address tries too often', async () => {
    app = await startTestApp({ changeConfig: (config) => { config.rateLimits.login.max = 3; } });
    const browser = app.newBrowser();
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await browser.logIn({ email: `user${i}@vetclinic.test`, password: 'some password here' })).status);
    assert.deepEqual(statuses, [401, 401, 401, 429]);

    const blocked = await browser.post('/login', { email: users.olivia.email, password: users.olivia.password });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });

  it('answers the API\'s 429 in JSON, like its other errors', async () => {
    app = await startTestApp({ changeConfig: (config) => { config.rateLimits.login.max = 1; } });
    const callApi = () => fetch(`${app.baseUrl}/api/appointments`);
    await callApi();
    const blocked = await callApi();
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error, /Too many attempts/);
  });
});
