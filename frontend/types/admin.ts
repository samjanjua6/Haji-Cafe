import { RoleName, UserScope } from './auth';

// Re-export auth types that admin components need
export type { RoleName, UserScope };

// Alias for convenience
export type UserRole = RoleName;
export type User = AdminUser;

export interface AdminUser {
  id: number;
  email: string;
  provider: string;
  role: { name: RoleName };
  userScopes: UserScope[];
  createdAt: string;
}

export interface RoleUpdate {
  role: RoleName;
}

export interface ScopeCreate {
  cafe_id?: number;
  branch_id?: number;
}
