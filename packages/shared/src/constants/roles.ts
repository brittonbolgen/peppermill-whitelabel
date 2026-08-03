/**
 * Roles and permissions.
 *
 * Permissions are declared as a flat, additive list rather than being inferred
 * from the role name. New capabilities can be introduced by adding a permission
 * string and granting it to the roles that need it, without touching any of the
 * call sites that already guard on the existing ones.
 */

export const ROLE_IDS = ['owner', 'admin', 'analyst', 'agent', 'viewer'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const PERMISSIONS = [
  'cases:read',
  'cases:write',
  'cases:respond',
  'alerts:read',
  'alerts:resolve',
  'analytics:read',
  'analytics:export',
  'notifications:read',
  'monitoring:read',
  'users:read',
  'users:write',
  'settings:read',
  'settings:write',
  'branding:write',
  'support:read',
  'support:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface RoleDefinition {
  id: RoleId;
  label: string;
  description: string;
  permissions: readonly Permission[];
}

const VIEWER_PERMISSIONS: readonly Permission[] = [
  'cases:read',
  'alerts:read',
  'analytics:read',
  'notifications:read',
  'support:read',
];

const AGENT_PERMISSIONS: readonly Permission[] = [
  ...VIEWER_PERMISSIONS,
  'cases:write',
  'cases:respond',
  'alerts:resolve',
  'support:write',
];

const ANALYST_PERMISSIONS: readonly Permission[] = [
  ...AGENT_PERMISSIONS,
  'analytics:export',
  'monitoring:read',
];

const ADMIN_PERMISSIONS: readonly Permission[] = [
  ...ANALYST_PERMISSIONS,
  'users:read',
  'users:write',
  'settings:read',
  'settings:write',
];

export const ROLES: Record<RoleId, RoleDefinition> = {
  owner: {
    id: 'owner',
    label: 'Owner',
    description: 'Full control including branding and billing.',
    permissions: [...ADMIN_PERMISSIONS, 'branding:write'],
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    description: 'Manages users, settings and the full case workflow.',
    permissions: ADMIN_PERMISSIONS,
  },
  analyst: {
    id: 'analyst',
    label: 'Analyst',
    description: 'Works cases and owns reporting and exports.',
    permissions: ANALYST_PERMISSIONS,
  },
  agent: {
    id: 'agent',
    label: 'Dispute Agent',
    description: 'Responds to chargebacks and resolves prevention alerts.',
    permissions: AGENT_PERMISSIONS,
  },
  viewer: {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only access across the portal.',
    permissions: VIEWER_PERMISSIONS,
  },
};

export function permissionsForRole(role: RoleId): readonly Permission[] {
  return ROLES[role].permissions;
}

export function roleCan(role: RoleId, permission: Permission): boolean {
  return ROLES[role].permissions.includes(permission);
}
