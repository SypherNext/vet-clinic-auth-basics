// The capstone's admin actions: switching an account off, and unlocking one.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users } from './helpers.js';
import { findUserByEmail } from '../src/users/users.js';

describe('admin account actions', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  async function adminDoes(action, email) {
    const admin = app.newBrowser();
    await admin.logIn(users.admin);
    await admin.get('/admin/users');
    const target = findUserByEmail(app.db, email);
    return admin.post(`/admin/users/${target.id}/${action}`);
  }

  it('disabling an account logs it out at once and blocks every login method', async () => {
    const ben = app.newBrowser();
    await ben.logIn(users.ben);
    assert.equal((await adminDoes('disable', users.ben.email)).location, '/admin/users');

    assert.equal((await ben.get('/pets')).location, '/login', 'the open session ended');
    const passwordLogin = await app.newBrowser().logIn(users.ben);
    assert.equal(passwordLogin.status, 403);
    const api = await fetch(`${app.baseUrl}/api/appointments`, {
      headers: { authorization: `Basic ${Buffer.from(`${users.ben.email}:${users.ben.password}`).toString('base64')}` },
    });
    assert.equal(api.status, 403);
  });

  it('only an admin can use the admin page', async () => {
    const vet = app.newBrowser();
    await vet.logIn(users.sam);
    assert.equal((await vet.get('/admin/users')).status, 403);
  });

  it('an admin cannot disable their own account', async () => {
    assert.equal((await adminDoes('disable', users.admin.email)).status, 400);
  });

  it('unlocks an account locked by wrong passwords', async () => {
    const attacker = app.newBrowser();
    for (let i = 0; i < 5; i++) await attacker.logIn({ email: users.olivia.email, password: `wrong guess number ${i}` });
    assert.equal((await app.newBrowser().logIn(users.olivia)).status, 401);
    await adminDoes('unlock', users.olivia.email);
    assert.equal((await app.newBrowser().logIn(users.olivia)).status, 302);
  });
});
