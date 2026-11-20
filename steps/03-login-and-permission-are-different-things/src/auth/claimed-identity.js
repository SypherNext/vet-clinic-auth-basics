// UNSAFE ON PURPOSE. This is the "before" picture for the course.
// Lesson 3 adds role checks (authorization) on top, but they cannot help
// while anyone can claim to be anyone.
//
// The server needs to know who sent each request. Here it simply believes
// whatever email is in the address bar (?as=olivia@vetclinic.test). Anyone
// can type any email, so anyone can be anyone. Lesson 5 replaces this file
// with a real password check, and lesson 6 with a session cookie.
import { findUserByEmail } from '../users/users.js';

export function claimedIdentity({ db }) {
  return (req, res, next) => {
    const claimed = req.query.as;
    req.user = claimed ? findUserByEmail(db, claimed) : null;
    res.locals.user = req.user;
    // Links on every page carry the claim along, because the server forgets
    // it between requests.
    res.locals.asQuery = req.user ? `?as=${encodeURIComponent(req.user.email)}` : '';
    next();
  };
}
