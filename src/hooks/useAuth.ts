"use client";

import { useAuthContext } from "@/lib/auth/AuthProvider";

export function useAuth() {
  return useAuthContext();
}
