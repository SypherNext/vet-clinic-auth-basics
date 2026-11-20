// A pretend passkey device for tests, so passkeys can be tested without a
// browser or a fingerprint reader. It does what a real authenticator does:
// makes a key pair, keeps the private key, and signs the server's challenge.
// You do not need to understand every byte here to follow the course; the
// WebAuthn specification describes the formats.
import crypto from 'node:crypto';

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

// ----- A tiny CBOR encoder: just the types WebAuthn needs -----
function cborHead(major, length) {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 256) return Buffer.from([(major << 5) | 24, length]);
  return Buffer.from([(major << 5) | 25, length >> 8, length & 0xff]);
}
function cbor(value) {
  if (Number.isInteger(value)) return value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value);
  if (Buffer.isBuffer(value)) return Buffer.concat([cborHead(2, value.length), value]);
  if (typeof value === 'string') return Buffer.concat([cborHead(3, Buffer.byteLength(value)), Buffer.from(value)]);
  if (value instanceof Map) {
    const parts = [cborHead(5, value.size)];
    for (const [k, v] of value) parts.push(cbor(k), cbor(v));
    return Buffer.concat(parts);
  }
  throw new Error(`cannot encode ${value}`);
}

const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;
const FLAG_ATTESTED_DATA = 0x40;

export function createSoftAuthenticator({ origin, rpID }) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const credentialId = crypto.randomBytes(16);
  const jwk = publicKey.export({ format: 'jwk' });
  let signCount = 0;
  let userHandle = null;

  const clientData = (type, challenge) =>
    Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));

  function authenticatorData(flags, extra = Buffer.alloc(0)) {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(signCount);
    return Buffer.concat([sha256(rpID), Buffer.from([flags]), count, extra]);
  }

  return {
    // Answers registration options, like navigator.credentials.create().
    register(options) {
      userHandle = options.user.id;
      const coseKey = cbor(new Map([
        [1, 2], [3, -7], [-1, 1],
        [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')],
      ]));
      const idLength = Buffer.from([0, credentialId.length]);
      const attested = Buffer.concat([Buffer.alloc(16), idLength, credentialId, coseKey]);
      const authData = authenticatorData(FLAG_USER_PRESENT | FLAG_USER_VERIFIED | FLAG_ATTESTED_DATA, attested);
      const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
      return {
        id: b64url(credentialId), rawId: b64url(credentialId), type: 'public-key',
        response: {
          clientDataJSON: b64url(clientData('webauthn.create', options.challenge)),
          attestationObject: b64url(attestationObject),
          transports: ['internal'],
        },
        clientExtensionResults: {},
      };
    },

    // Answers authentication options, like navigator.credentials.get().
    logIn(options) {
      signCount += 1;
      const authData = authenticatorData(FLAG_USER_PRESENT | FLAG_USER_VERIFIED);
      const clientDataJSON = clientData('webauthn.get', options.challenge);
      const signature = crypto.sign('sha256', Buffer.concat([authData, sha256(clientDataJSON)]), privateKey);
      return {
        id: b64url(credentialId), rawId: b64url(credentialId), type: 'public-key',
        response: {
          clientDataJSON: b64url(clientDataJSON),
          authenticatorData: b64url(authData),
          signature: b64url(signature),
          userHandle,
        },
        clientExtensionResults: {},
      };
    },
  };
}
