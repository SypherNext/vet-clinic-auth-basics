// Shared tools for the tests: a fresh app per test, a tiny "browser" that
// keeps cookies and CSRF tokens, and helpers to read the emails the app sent.
import { once } from 'node:events';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db/database.js';
import { seedDatabase, SEED_USERS } from '../src/db/seed.js';
import { createMemoryMailer } from '../src/mail/mailer.js';
import { createSmsOutbox } from '../src/sms/sms-outbox.js';
import { createApp } from '../src/app.js';

export const MINUTE = 60_000;

// The seeded people, by first name: users.olivia.email, users.olivia.password ...
export const users = Object.fromEntries(
  SEED_USERS.map((u) => [u.email.split('@')[0], u]),
);

// A clock the test controls. clock.advance(11 * MINUTE) jumps forward.
export function createFakeClock(start = Date.parse('2026-11-05T09:00:00Z')) {
  let time = start;
  return {
    now: () => time,
    advance: (ms) => { time += ms; },
  };
}

// Starts the whole app on a random free port, with an in-memory database,
// a memory mailer and a fake clock. changeConfig can tighten limits for a test.
export async function startTestApp({ changeConfig } = {}) {
  const config = loadConfig({ MAIL_TRANSPORT: 'memory' });
  changeConfig?.(config);
  const db = openDatabase(':memory:');
  const clock = createFakeClock();
  await seedDatabase(db, { now: clock.now() });
  const mailer = createMemoryMailer();
  const sms = createSmsOutbox({ db, clock });
  const app = createApp({ config, db, clock, mailer, sms });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  // Links in emails, and the origin passkeys are made for, point at this test server.
  config.appOrigin = baseUrl;
  config.passkeys.origin = baseUrl;

  return {
    baseUrl, config, db, clock, mailer, sms,
    newBrowser: () => new TestBrowser(baseUrl),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Just enough of a browser: it stores cookies, remembers the CSRF token from
// the last page, and does not follow redirects (so tests can check them).
export class TestBrowser {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
    this.csrfToken = '';
  }

  cookieHeader() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  async request(method, path, { form, json, headers = {} } = {}) {
    const allHeaders = { ...headers };
    if (this.cookies.size) allHeaders.cookie = this.cookieHeader();
    let body;
    if (form) {
      allHeaders['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }
    if (json) {
      allHeaders['content-type'] = 'application/json';
      allHeaders['x-csrf-token'] = this.csrfToken;
      body = JSON.stringify(json);
    }
    const response = await fetch(this.baseUrl + path, { method, headers: allHeaders, body, redirect: 'manual' });
    this.rememberCookies(response);
    const text = await response.text();
    const token = text.match(/name="csrf-token" content="([^"]+)"/);
    if (token) this.csrfToken = token[1];
    return { status: response.status, location: response.headers.get('location'), headers: response.headers, text };
  }

  rememberCookies(response) {
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const [name, value] = pair.split('=');
      if (/expires=Thu, 01 Jan 1970/i.test(line)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  get(path) {
    return this.request('GET', path);
  }

  // Posts a form the way a real page would: with the page's CSRF token.
  post(path, fields = {}) {
    return this.request('POST', path, { form: { _csrf: this.csrfToken, ...fields } });
  }

  postJson(path, json = {}) {
    return this.request('POST', path, { json });
  }

  async logIn(user) {
    await this.get('/login');
    return this.post('/login', { email: user.email, password: user.password });
  }
}

// The newest email sent to an address, and the site path of the link inside it.
export function lastEmailTo(mailer, email) {
  return mailer.sent.filter((m) => m.to === email).at(-1) ?? null;
}

export function linkPathIn(email) {
  const url = email.text.match(/https?:\/\/\S+/)[0];
  const { pathname, search } = new URL(url);
  return pathname + search;
}

export function tokenIn(email) {
  return new URL(email.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
}

export function codeIn(text) {
  return text.match(/\b(\d{6})\b/)[1];
}
