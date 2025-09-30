"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { Suspense } from "react";

export function ConditionalHeader() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Only render header when user is logged in OR on pages other than landing page
  const shouldRenderHeader = user || (pathname !== '/');

  if (!shouldRenderHeader) {
    return null;
  }

  return (
    <Suspense fallback={<div className="app-header-universal" style={{ height: '64px' }}></div>}>
      <AppHeader />
    </Suspense>
  );
}