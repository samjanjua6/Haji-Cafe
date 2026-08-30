"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function GlobalKitchenRedirect() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    const branchId = user?.scopes?.[0]?.branchId || 3;
    router.replace(`/branches/${branchId}/kitchen`);
  }, [user, isLoading, router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Opening Kitchen Display System...</div>
    </div>
  );
}
