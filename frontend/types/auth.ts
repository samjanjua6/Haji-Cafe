export interface User {
  id: number;
  email: string;
  provider: string;
  role: { name: string };
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
