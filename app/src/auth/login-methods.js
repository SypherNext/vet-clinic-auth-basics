// Every way to log in to the portal, described in one list.
//
// Each login method lives in its own folder under src/auth/ and follows the
// same shape:
//   1. Its routes prove who the visitor is, in that method's own way.
//   2. Then they call finishLogin(deps, req, res, user, METHOD) from
//      login-flow.js, which decides whether a second step is needed and
//      starts the session.
// The login page reads this list, so adding a method means adding a folder
// and one entry here.
//
// isMultiFactor: true when the method already proves two things on its own
// (a passkey is something you have, unlocked by your fingerprint or PIN), so
// no extra authenticator-app step is asked for.

export const LOGIN_METHODS = {
  password: {
    id: 'password',
    name: 'Email and password',
    startPath: '/login',
    description: 'Your email address and your password.',
    isMultiFactor: false,
  },
  magicLink: {
    id: 'magic_link',
    name: 'Email me a login link',
    startPath: '/login/magic-link',
    description: 'No password: we email you a link that logs you in once.',
    isMultiFactor: false,
  },
  loginCode: {
    id: 'login_code',
    name: 'Send me a code',
    startPath: '/login/code',
    description: 'No password: we send a short code by email or text message.',
    isMultiFactor: false,
  },
  passkey: {
    id: 'passkey',
    name: 'Passkey',
    startPath: '/login/passkey',
    description: 'Use your fingerprint, face or device PIN. Nothing to type or remember.',
    isMultiFactor: true,
  },
};

// The order the login page shows them in.
export const LOGIN_PAGE_METHODS = [
  LOGIN_METHODS.passkey,
  LOGIN_METHODS.magicLink,
  LOGIN_METHODS.loginCode,
];

// Second steps are not login methods on their own, but events name them.
const SECOND_STEP_NAMES = { authenticator_app: 'authenticator app' };

// 'password+authenticator_app' -> 'Email and password + authenticator app'
export function methodName(id) {
  return id.split('+')
    .map((part) => Object.values(LOGIN_METHODS).find((m) => m.id === part)?.name ?? SECOND_STEP_NAMES[part] ?? part)
    .join(' + ');
}
