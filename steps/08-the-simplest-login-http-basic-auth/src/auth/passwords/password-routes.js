// Pages for the password method: create an account, log in, change password.
import express from 'express';
import { readEmail, readPassword, readText, readPhone } from '../../http/validate.js';
import { createUser, findUserByEmail } from '../../users/users.js';
import { startUserSession, setFlash } from '../../sessions/sessions.js';
import { requireLogin } from '../../access/require.js';
import { homePathFor } from '../../access/roles.js';
import { hashPassword, verifyPassword } from './password-hashing.js';
import { problemWithNewPassword } from './password-policy.js';
import { checkPasswordLogin, WRONG_LOGIN_MESSAGE, setNewPassword } from './password-service.js';

const MAX_NAME_LENGTH = 80;

// Starts the logged-in session and says where to go next.
function logIn(deps, req, res, user) {
  startUserSession(deps, req, res, user.id);
  return homePathFor(user);
}

// Reads the sign-up form. Returns { values } or { error }.
function readSignupForm(body, passwordRules) {
  const name = readText(body.name, { maxLength: MAX_NAME_LENGTH });
  const email = readEmail(body.email);
  const password = readPassword(body.password, passwordRules);
  const phone = readPhone(body.phone);
  if (!name) return { error: 'Please enter your name.' };
  if (!email) return { error: 'Please enter a valid email address.' };
  if (body.phone?.trim() && !phone) return { error: 'Please enter a valid phone number, or leave it empty.' };
  if (!password) return { error: 'Please choose a password.' };
  const problem = problemWithNewPassword(password, passwordRules, { email });
  if (problem) return { error: problem };
  return { values: { name, email, phone, password } };
}

export function passwordRoutes(deps) {
  const { db, config, clock } = deps;
  const router = express.Router();

  const renderLogin = (res, { email = '', error = null } = {}) =>
    res.render('login', { email, error });

  router.get('/login', (req, res) => {
    if (req.user) return res.redirect(homePathFor(req.user));
    renderLogin(res);
  });

  router.post('/login', async (req, res) => {
    const email = readEmail(req.body.email);
    const password = readPassword(req.body.password, config.passwords) ?? '';
    const result = await checkPasswordLogin(deps, { email, password });
    if (result.failure) {
      return renderLogin(res.status(401), { email: req.body.email, error: WRONG_LOGIN_MESSAGE });
    }
    res.redirect(logIn(deps, req, res, result.user));
  });

  router.get('/signup', (req, res) => {
    res.render('signup', { values: {}, error: null, minLength: config.passwords.minLength });
  });

  router.post('/signup', async (req, res) => {
    const { values, error } = readSignupForm(req.body, config.passwords);
    const showForm = (message) => res.status(400).render('signup', {
      values: req.body, error: message, minLength: config.passwords.minLength,
    });
    if (error) return showForm(error);
    if (findUserByEmail(db, values.email)) {
      return showForm('An account with this email already exists. Please log in.');
    }
    const user = createUser(db, {
      email: values.email, name: values.name, phone: values.phone,
      passwordHash: await hashPassword(values.password), now: clock.now(),
    });
    const nextPath = logIn(deps, req, res, user);
    setFlash(deps, req, res, `Welcome, ${user.name}. Your account is ready.`);
    res.redirect(nextPath);
  });

  router.post('/account/password', requireLogin, async (req, res) => {
    const user = req.user;
    const newPassword = readPassword(req.body.new_password, config.passwords);
    // Ask for the current password, so someone at an unlocked computer cannot change it.
    const currentOk = user.password_hash === null
      || await verifyPassword(user.password_hash, req.body.current_password ?? '');
    const backToAccount = (text, tone) => {
      setFlash(deps, req, res, text, tone);
      res.redirect('/account');
    };
    if (!currentOk) return backToAccount('Your current password was not right.', 'error');
    if (!newPassword) return backToAccount('Please enter a new password.', 'error');
    const problem = await setNewPassword(deps, user, newPassword, { keepSessionId: req.session.id });
    if (problem) return backToAccount(problem, 'error');
    backToAccount('Password changed. Your other sessions were logged out.');
  });

  return router;
}
