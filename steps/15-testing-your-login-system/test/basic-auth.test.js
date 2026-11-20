// HTTP Basic Auth on the JSON API.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users } from './helpers.js';
import { enableAuthenticatorApp, findUserByEmail } from '../src/users/users.js';

const basic = (email, password) => `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;

describe('HTTP Basic Auth', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  const getAppointments = (authorization) =>
    fetch(`${app.baseUrl}/api/appointments`, { headers: authorization ? { authorization } : {} });

  it('asks for credentials with 401 and WWW-Authenticate', async () => {
    const response = await getAppointments();
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Basic realm="Vet clinic API", charset="UTF-8"');
  });

  it('returns only the caller\'s appointments', async () => {
    const response = await getAppointments(basic(users.ben.email, users.ben.password));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.appointments.map((a) => a.pet_name), ['Pepper']);
  });

  it('refuses a wrong password', async () => {
    assert.equal((await getAppointments(basic(users.ben.email, 'wrong password for ben'))).status, 401);
  });

  it('refuses an account that has two-step login turned on', async () => {
    const ben = findUserByEmail(app.db, users.ben.email);
    enableAuthenticatorApp(app.db, ben.id, { secret: 'JBSWY3DPEHPK3PXP', now: app.clock.now() });
    assert.equal((await getAppointments(basic(users.ben.email, users.ben.password))).status, 403);
  });
});
