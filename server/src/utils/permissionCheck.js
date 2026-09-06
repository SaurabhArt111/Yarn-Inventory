// Pure helper for checking whether a set of granted permissions satisfies
// a requirement. Isolated from Express/Mongoose so it can be unit tested
// and reused (e.g. to compute what the frontend nav should render).
export function hasPermission(grantedPermissions, required) {
  if (!Array.isArray(grantedPermissions)) return false;
  if (Array.isArray(required)) {
    return required.every((p) => grantedPermissions.includes(p));
  }
  return grantedPermissions.includes(required);
}

export function hasAnyPermission(grantedPermissions, requiredList) {
  if (!Array.isArray(grantedPermissions)) return false;
  return requiredList.some((p) => grantedPermissions.includes(p));
}
