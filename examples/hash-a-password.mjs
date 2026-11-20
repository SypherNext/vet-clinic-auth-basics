// Hashes one password twice with the app's own argon2id settings, then checks
// a right and a wrong guess. Run from the repo root: node examples/hash-a-password.mjs
// (install the app first: cd app && npm ci)
import { hashPassword, verifyPassword } from '../app/src/auth/passwords/password-hashing.js';

const password = 'biscuit and mango love naps';

const started = performance.now();
const first = await hashPassword(password);
const elapsed = performance.now() - started;
const second = await hashPassword(password);

console.log('first hash: ', first);
console.log('second hash:', second);
console.log('same text?  ', first === second);
console.log('right password matches:', await verifyPassword(first, password));
console.log('wrong password matches:', await verifyPassword(first, 'biscuit and mango love nap'));
console.log(`one hash took about ${Math.round(elapsed)} ms`);
