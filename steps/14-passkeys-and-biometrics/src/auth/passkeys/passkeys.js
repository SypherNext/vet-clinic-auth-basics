// The server side of passkeys (WebAuthn), using @simplewebauthn/server.
//
// Both ceremonies have two rounds:
//   1. options: the server sends a random challenge (and, when registering,
//      who the user is). The challenge waits in the session.
//   2. verify: the browser sends back what the authenticator signed. The
//      server checks the signature, the challenge, the site's origin and that
//      the user unlocked the device (user verification).
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { HttpError } from '../../http/errors.js';
import { randomToken } from '../../security/tokens.js';
import { updateSessionData } from '../../sessions/sessions.js';
import { findUserById, setWebauthnUserId } from '../../users/users.js';
import { savePasskey, findPasskey, listPasskeys, recordPasskeyUse } from './passkey-store.js';

const NOT_ACCEPTED = 'The passkey was not accepted. Please try again.';

// ----- The challenge, kept in the session between the two rounds -----

function rememberChallenge(deps, req, purpose, challenge) {
  updateSessionData(deps, req, { passkeyChallenge: { purpose, challenge, createdAt: deps.clock.now() } });
}

// Each challenge can be used once, for one purpose, for a few minutes.
function takeChallenge(deps, req, purpose) {
  const saved = req.session.data.passkeyChallenge;
  updateSessionData(deps, req, { passkeyChallenge: undefined });
  const fresh = saved && deps.clock.now() - saved.createdAt <= deps.config.passkeys.challengeMs;
  if (!fresh || saved.purpose !== purpose) throw new HttpError(400, 'Passkey', 'This passkey request expired. Please try again.');
  return saved.challenge;
}

// ----- Adding a passkey to an account -----

// Authenticators get a random handle for the user, never the email or row id.
function webauthnUserIdFor(deps, user) {
  if (user.webauthn_user_id) return user.webauthn_user_id;
  const id = randomToken();
  setWebauthnUserId(deps.db, user.id, id);
  return id;
}

export async function registrationOptions(deps, req, user) {
  const { rpName, rpID } = deps.config.passkeys;
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name,
    userID: Buffer.from(webauthnUserIdFor(deps, user), 'base64url'),
    attestationType: 'none',
    // Do not register the same authenticator twice.
    excludeCredentials: listPasskeys(deps.db, user.id).map((p) => ({ id: p.id, transports: p.transports })),
    authenticatorSelection: {
      residentKey: 'required', // a discoverable passkey: log in without typing an email
      userVerification: 'required', // fingerprint, face or PIN every time
    },
  });
  rememberChallenge(deps, req, 'register', options.challenge);
  return options;
}

export async function verifyRegistration(deps, req, user, { response, name }) {
  const { origin, rpID } = deps.config.passkeys;
  const expectedChallenge = takeChallenge(deps, req, 'register');
  let result;
  try {
    result = await verifyRegistrationResponse({
      response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
    });
  } catch {
    throw new HttpError(400, 'Passkey', NOT_ACCEPTED);
  }
  if (!result.verified) throw new HttpError(400, 'Passkey', NOT_ACCEPTED);
  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
  savePasskey(deps.db, {
    userId: user.id, credential, deviceType: credentialDeviceType, backedUp: credentialBackedUp,
    name, now: deps.clock.now(),
  });
}

// ----- Logging in with a passkey -----

export async function authenticationOptions(deps, req) {
  const options = await generateAuthenticationOptions({
    rpID: deps.config.passkeys.rpID,
    userVerification: 'required',
    // An empty list lets the browser offer any passkey it holds for this site.
    allowCredentials: [],
  });
  rememberChallenge(deps, req, 'login', options.challenge);
  return options;
}

// Returns the user the passkey belongs to, or throws a 400 error.
export async function verifyAuthentication(deps, req, response) {
  const { origin, rpID } = deps.config.passkeys;
  const expectedChallenge = takeChallenge(deps, req, 'login');
  const passkey = findPasskey(deps.db, response?.id);
  const user = passkey && findUserById(deps.db, passkey.userId);
  // The authenticator also says which user it thinks this is. It must agree.
  if (!user || response.response?.userHandle !== user.webauthn_user_id) {
    throw new HttpError(400, 'Passkey', NOT_ACCEPTED);
  }
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
      credential: { id: passkey.id, publicKey: passkey.publicKey, counter: passkey.counter, transports: passkey.transports },
    });
  } catch {
    throw new HttpError(400, 'Passkey', NOT_ACCEPTED);
  }
  if (!result.verified) throw new HttpError(400, 'Passkey', NOT_ACCEPTED);
  recordPasskeyUse(deps.db, passkey.id, { counter: result.authenticationInfo.newCounter, now: deps.clock.now() });
  return user;
}
