// The database and every authorizeRole call still speak these three values.
// Only what the user reads is different, so keep the mapping in one place
// rather than spelling the labels out at each display site.
export const ROLE_SUPER_ADMIN = "superadmin";
export const ROLE_TEAM_ADMIN = "admin";
export const ROLE_EMPLOYEE = "employee";

const ROLE_LABELS = {
  [ROLE_SUPER_ADMIN]: "Super Admin",
  [ROLE_TEAM_ADMIN]: "Team Admin",
  [ROLE_EMPLOYEE]: "Employee",
};

// Roles a Super Admin can hand out. Super Admin is deliberately absent: the
// backend forces anyone else to create employees, and promoting someone to
// Super Admin is not something the user form should offer.
export const ASSIGNABLE_ROLES = [ROLE_TEAM_ADMIN, ROLE_EMPLOYEE];

// Unknown values are shown as-is instead of being hidden, so stale data is
// visible rather than silently rendered as blank.
export const roleLabel = (role) => ROLE_LABELS[role] ?? role ?? "";

export const ROLE_BADGE_CLASSES = {
  [ROLE_SUPER_ADMIN]: "bg-purple-100 text-purple-700",
  [ROLE_TEAM_ADMIN]: "bg-amber-100 text-amber-700",
  [ROLE_EMPLOYEE]: "bg-green-100 text-green-700",
};

export const roleBadgeClass = (role) =>
  ROLE_BADGE_CLASSES[role] ?? "bg-slate-100 text-slate-700";
