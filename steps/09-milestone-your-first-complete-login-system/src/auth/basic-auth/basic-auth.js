// HTTP Basic Auth: the email and password travel in an Authorization header
// on EVERY request, as "Basic " + base64("email:password").
// Base64 is not encryption (anyone can decode it), so Basic Auth is only
// safe over HTTPS. There is no session and no logout: the client simply
// stops sending the header.
import { readEmail } from '../../http/validate.js';
import { checkPasswordLogin, loginFailureMessage } from '../passwords/password-service.js';

const REALM = 'Vet clinic API';

// "Basic b2xpdmlh..." -> { username, password }, or null if the header is missing or broken.
export function readBasicCredentials(header) {
  if (!header?.startsWith('Basic ')) return null;
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon < 0) return null;
  return { username: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

// 401 plus WWW-Authenticate tells the client "send a username and password".
function askForCredentials(res, message) {
  res.set('WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`);
  res.status(401).json({ error: message });
}

export function basicAuth(deps) {
  return async (req, res, next) => {
    const credentials = readBasicCredentials(req.get('authorization'));
    if (!credentials) return askForCredentials(res, 'Send your email and password with HTTP Basic Auth.');

    const result = await checkPasswordLogin(deps, req, {
      email: readEmail(credentials.username),
      password: credentials.password,
    });
    if (result.failure) return askForCredentials(res, loginFailureMessage(result.failure, deps.config));

    req.user = result.user;
    next();
  };
}
