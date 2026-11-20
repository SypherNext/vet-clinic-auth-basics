// Sign-up, password storage and wrong passwords.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, users } from './helpers.js';
import { findUserByEmail } from '../src/users/users.js';

describe('passwords', () => {
  let app;
  beforeEach(async () => { app = await startTestApp(); });
  afterEach(() => app.close());

  it('stores an argon2id hash, never the password itself', () => {
    const olivia = findUserByEmail(app.db, users.olivia.email);
    assert.match(olivia.password_hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert.ok(!olivia.password_hash.includes(users.olivia.password));
  });

  it('refuses a short password and a common one at sign-up', async () => {
    const browser = app.newBrowser();
    await browser.get('/signup');
    const short = await browser.post('/signup', { name: 'Kim', email: 'kim@vetclinic.test', password: 'Dog$2026' });
    assert.equal(short.status, 400);
    assert.match(short.text, /at least 15 characters/);

    const common = await browser.post('/signup', { name: 'Kim', email: 'kim@vetclinic.test', password: 'iloveyouiloveyou' });
    assert.equal(common.status, 400);
    assert.match(common.text, /list of common passwords/);
    assert.equal(findUserByEmail(app.db, 'kim@vetclinic.test'), null);
  });

  it('signs up, logs in and sends a verification email', async () => {
    const browser = app.newBrowser();
    await browser.get('/signup');
    const response = await browser.post('/signup', {
      name: 'Kim Lee', email: 'kim@vetclinic.test', password: 'my cat ignores me every morning',
    });
    assert.equal(response.status, 302);
    assert.equal(response.location, '/pets');
    assert.equal(app.mailer.sent.at(-1).subject, 'Confirm your email address');
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const browser = app.newBrowser();
    const wrongPassword = await browser.logIn({ email: users.olivia.email, password: 'not her password at all' });
    const unknownEmail = await browser.logIn({ email: 'nobody@vetclinic.test', password: 'not her password at all' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    const message = (text) => text.match(/<p class="error">([^<]+)<\/p>/)[1];
    assert.equal(message(wrongPassword.text), message(unknownEmail.text));
  });
});
