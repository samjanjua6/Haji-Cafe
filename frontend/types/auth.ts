export interface User {
  id: number;
  email: string;
  role: { name: 'SUPER_ADMIN' | 'CAFE_OWNER' | 'BRANCH_MANAGER' | 'STAFF' };
  googleConnected?: boolean;
  userScopes: UserScope[];
}

export interface UserScope {
  id: number;
  userId: number;
  cafeId: number | null;
  branchId: number | null;
  cafe?: { id: number; name: string } | null;
  branch?: { id: number; name: string; cafeId: number } | null;
}

export type RoleName = 'SUPER_ADMIN' | 'CAFE_OWNER' | 'BRANCH_MANAGER' | 'STAFF';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse extends User {}
