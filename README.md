# Maple Street Vet Clinic portal

Companion code for the Sypher course **"Authentication Basics: Passwords, Sessions and Passwordless Login"**.

The app is a small vet clinic portal. Pet owners see their pets and appointments, vets see their patients, and an admin manages users. You can log in four ways: email and password (with an optional authenticator app as a second step), a magic link by email, a one-time code by email or a simulated text message, and a passkey. A small JSON API uses HTTP Basic Auth.

It is a server-rendered Express 5 app in plain modern JavaScript (no TypeScript, no build step), with EJS templates and SQLite through Node's built-in `node:sqlite` module. Emails go to Mailpit, a local test mail server with a web inbox, which runs in Docker.

All people, pets, emails and phone numbers in this repository are made up. Never use the seeded passwords anywhere real.

## Set up your computer

You need Node.js 24 (an LTS release), Git and, for the email lessons, Docker. Commands are for a bash shell: the terminal on macOS and Linux, or Git Bash or WSL on Windows.

| Tool | Windows | macOS | Ubuntu or Debian |
| --- | --- | --- | --- |
| Node.js 24 | `winget install Schniz.fnm`, then `fnm install 24` and `fnm use 24` | `brew install fnm`, then `fnm install 24` and `fnm use 24` | `curl -fsSL https://fnm.vercel.app/install \| bash`, then `fnm install 24` and `fnm use 24` |
| Git | `winget install --id Git.Git -e` | `brew install git` | `sudo apt install -y git` |
| Docker | `winget install -e --id Docker.DockerDesktop` (needs WSL 2) | `brew install --cask docker` | `curl -fsSL https://get.docker.com \| sh` |

Check them in a new terminal:

```bash
node --version     # v24.x.x
npm --version      # 11.x.x
git --version
docker version     # needs both a Client and a Server section
```

The password library (`argon2`) ships ready-made binaries for Windows, macOS and Linux, so you do not need Visual Studio, Xcode or any C++ build tools. Recent npm versions print a warning that the install script of `argon2` is not yet approved (`npm warn allow-scripts`). You can ignore it: that script only checks that a ready-made binary is present, and the binary is already in the download, so the package works whether or not the script runs.

## Run the app

```bash
git clone <vet-clinic-auth-basics repository URL> vet-clinic-auth-basics
cd vet-clinic-auth-basics/app
npm ci                  # install the exact versions in package-lock.json
docker compose up -d    # start Mailpit (container auab-mailpit)
npm run seed            # create data/vet-clinic.db with fake users
npm start               # http://localhost:18820
```

Open **http://localhost:18820** (use `localhost`, not `127.0.0.1`: passkeys need it). Emails arrive in Mailpit at **http://localhost:18826**. Simulated text messages appear on the app's own page **http://localhost:18820/dev/sms-outbox**. Nothing is sent to a real phone.

No Docker? Run `MAIL_TRANSPORT=memory npm start` and every email is printed in the terminal instead.

The seeded accounts (all made up):

| Email | Password | Role |
| --- | --- | --- |
| olivia@vetclinic.test | `biscuit and mango love naps` | pet owner (Biscuit and Mango) |
| ben@vetclinic.test | `pepper the rabbit hops daily` | pet owner (Pepper) |
| sam@vetclinic.test | `stethoscope on a rainy tuesday` | vet |
| lee@vetclinic.test | `x-rays before lunch, always` | vet |
| admin@vetclinic.test | `the front desk keeps the keys` | admin |

`npm run seed` deletes the database and starts again, so you can always get back to this state. Stop the app (Ctrl+C) before you seed: a running app keeps the database file open, and on Windows the delete then fails with `EPERM`.

Stop everything with Ctrl+C in the app's terminal and `docker compose down` in `app/`.

## Run the tests

```bash
cd app
npm test
```

The tests start the app on a random port with an in-memory database, a memory mailer and a fake clock, so they need neither Docker nor the network. They cover wrong passwords, lockout and rate limits, session fixation, logout, timeouts, CSRF, reset links, magic links, expired and over-used codes, the authenticator app, recovery codes, passkeys (with a software authenticator), HTTP Basic Auth and the admin actions.

## Project layout

```text
vet-clinic-auth-basics/
  app/                        the finished app at the end of the course
    compose.yaml              Mailpit, the local test mail server (auab-mailpit)
    .env.example              every setting, with its default value
    src/
      server.js               starts the server with the real database, mailer and clock
      app.js                  builds the Express app from its parts (deps passed in)
      config.js               every setting and limit in one place
      clock.js                the time, asked for instead of Date.now() so tests can fake it
      format.js               durations and times in words
      db/                     node:sqlite connection, numbered migrations, seed data
      users/users.js          all queries about people
      sessions/               session table, session cookie, logout routes
      access/                 requireLogin, requireRole and each role's home page
      auth/                   one folder per login method, plus:
        login-methods.js      the list of login methods the login page shows
        login-flow.js         finishLogin(): the end of every login, second step included
        passwords/            hashing, password rules, sign-up, login, change password
        basic-auth/           HTTP Basic Auth for the API
        email-links/          one-use email links: verify email, reset password
        magic-links/          log in with a link by email
        login-codes/          log in with a code by email or SMS
        authenticator-app/    TOTP codes, QR setup, recovery codes
        passkeys/             WebAuthn with @simplewebauthn/server
      security/               random tokens, CSRF, rate limits, response headers
      audit/auth-events.js    the sign-in history shown on the account page
      mail/                   SMTP and memory mailers, email texts
      sms/sms-outbox.js       the SIMULATED text message service
      api/api-routes.js       the JSON API behind Basic Auth
      account/                the account page
      portal/                 pets, patients and the admin's user list
      dev/                    developer-only pages (the SMS outbox)
      views/                  EJS page templates
      public/                 the stylesheet and the browser half of passkeys
    test/                     node:test tests, helpers and a software passkey authenticator
  steps/                      the app as it stands at the end of each lesson that changes it
```

### Steps

Each folder in `steps/` is a complete, runnable copy of the app at the end of one lesson. Open the folder, then run `npm install`, `npm run seed` and `npm start` inside it.

| Folder | What the lesson adds |
| --- | --- |
| `02-how-logging-in-works-on-the-web` | the starting portal, which believes any email you type (unsafe on purpose) |
| `03-login-and-permission-are-different-things` | role checks, still on top of the unsafe identity |
| `05-sign-up-and-storing-passwords-safely` | sign-up, argon2id hashes, a password check that nothing remembers yet |
| `06-staying-logged-in-with-cookies` | sessions in SQLite and a session cookie |
| `07-logging-out-and-keeping-sessions-safe` | logout, timeouts, a new session id at login, CSRF tokens, security headers, account page |
| `08-the-simplest-login-http-basic-auth` | a JSON API protected by HTTP Basic Auth |
| `09-milestone-your-first-complete-login-system` | lockout, rate limits and a sign-in history |
| `10-email-verification-and-password-reset` | Mailpit, email verification, password reset links |
| `11-magic-links-login-by-email` | magic links, and one `finishLogin()` shared by every login method |
| `12-one-time-codes-by-email-and-sms` | one-time codes by email and a simulated SMS outbox |
| `13-two-step-login-with-an-authenticator-app` | TOTP with QR setup and recovery codes |
| `14-passkeys-and-biometrics` | passkeys |
| `15-testing-your-login-system` | the automated tests |
| `16-capstone-a-portal-with-four-ways-to-log-in` | points to `app/`, which is the capstone |

Lessons 0, 1 and 4 do not change the code.

## Building on this app

The app is written to be extended. To add a login method, add a folder under `src/auth/`, a router that proves who the visitor is and then calls `finishLogin(deps, req, res, user, METHOD)`, an entry in `src/auth/login-methods.js`, and the router in the `PAGE_ROUTES` list in `src/app.js`. To change the schema, add the next numbered file in `src/db/migrations/`; never edit one that has already run. Access rules live in `src/access/`.

## Troubleshooting

- **`EADDRINUSE` on port 18820:** another copy of the app is running. Stop it, or start this one with `PORT=18821 APP_ORIGIN=http://localhost:18821 npm start`.
- **Emails do not arrive / `ECONNREFUSED 127.0.0.1:18825`:** Mailpit is not running. Run `docker compose up -d` in `app/`, or use `MAIL_TRANSPORT=memory`.
- **`EPERM` from `npm run seed`:** the app is still running and holds the database open. Stop it with Ctrl+C, seed, then start it again.
- **"Form expired" (403) after restarting:** the page was loaded before you re-seeded the database. Reload the page and try again.
- **Passkey button does nothing or says the browser does not support passkeys:** open the app at `http://localhost:18820`, not `127.0.0.1`. Passkeys need a secure context and a domain name as the relying party ID; the app uses `localhost`, and an IP address such as `127.0.0.1` can never be one.
- **Authenticator code is always wrong:** check that your phone's clock is set automatically. Codes change every 30 seconds.
- **`npm warn allow-scripts ... argon2`:** expected; see "Set up your computer".
- **Git Bash rewrites paths that start with `/`:** run `export MSYS_NO_PATHCONV=1` first.

## License

Copyright (C) 2026 SypherNext

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). You may
use, study and change it. If you share a modified version, or run one as a website or service
that other people use, you must make your full modified source code available under the same
license. See [LICENSE](LICENSE) for the full terms.
