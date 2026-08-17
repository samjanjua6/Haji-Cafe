import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  has_google_calendar: boolean;
  scopes: {
    cafeId: number | null;
    branchId: number | null;
    cafeName: string | null;
    branchName: string | null;
  }[];
}

/**
 * Shared hook for the current logged-in user profile.
 * Uses React Query so the result is cached — Sidebar and Dashboard
 * both call this hook but only ONE network request is ever made.
 * Cached for 5 minutes; stale for 1 minute.
 */
export function useCurrentUser() {
  const router = useRouter();

  const query = useQuery<UserProfile>({
    queryKey: ["currentUser"],
    queryFn: () => api.get<UserProfile>("/auth/me"),
    staleTime: 1000 * 60,      // consider fresh for 1 min
    gcTime: 1000 * 60 * 5,     // keep in cache for 5 min
    retry: false,
    enabled: auth.isLoggedIn(),
  });

  // If the request fails (expired token), clear and redirect to login
  if (query.isError) {
    auth.clear();
    router.push("/");
  }

  return query;
}
