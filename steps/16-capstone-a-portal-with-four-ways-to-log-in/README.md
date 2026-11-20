# Step 16: Capstone: A Portal with Four Ways to Log In

The capstone's code is the finished app in [`../../app`](../../app). It is not
copied here, so there is exactly one copy of the final code.

Compared with step 15, the capstone adds:

- `src/db/migrations/010-account-status.sql`: an admin can switch an account off
- `src/portal/admin-routes.js`: the admin's user list with Disable, Enable,
  Unlock and Log out everywhere
- `isActive()`, `findActiveUserById()` and `findActiveUserByEmail()` in
  `src/users/users.js`, used by every login method, so a disabled account
  cannot log in by any of them
- `test/admin.test.js`: four tests for the admin actions
