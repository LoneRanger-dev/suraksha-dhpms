"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/lib/auth-store";

export function useRequireAuth(allowedRoles?: string[]) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.replace("/login");
    }
  }, [token, role, allowedRoles, router]);

  return { token, role };
}
