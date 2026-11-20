// Every way to log in to the portal, described in one list.
//
// Each login method lives in its own folder under src/auth/ and follows the
// same shape:
//   1. Its routes prove who the visitor is, in that method's own way.
//   2. Then they call finishLogin(deps, req, res, user, METHOD) from
//      login-flow.js, which starts the session.
// The login page reads this list, so adding a method means adding a folder
// and one entry here.

export const LOGIN_METHODS = {
  password: {
    id: 'password',
    name: 'Email and password',
    startPath: '/login',
    description: 'Your email address and your password.',
  },
  magicLink: {
    id: 'magic_link',
    name: 'Email me a login link',
    startPath: '/login/magic-link',
    description: 'No password: we email you a link that logs you in once.',
  },
};

// The order the login page shows them in.
export const LOGIN_PAGE_METHODS = [
  LOGIN_METHODS.magicLink,
];

export function methodName(id) {
  return Object.values(LOGIN_METHODS).find((m) => m.id === id)?.name ?? id;
}
