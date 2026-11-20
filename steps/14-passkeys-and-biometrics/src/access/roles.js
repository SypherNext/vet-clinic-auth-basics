// The page each kind of person sees first. The roles themselves (owner,
// vet, admin) are listed in the users table: see migration 001.
const HOME_PATHS = {
  owner: '/pets',
  vet: '/patients',
  admin: '/admin/users',
};

export function homePathFor(user) {
  return HOME_PATHS[user.role] ?? '/';
}
