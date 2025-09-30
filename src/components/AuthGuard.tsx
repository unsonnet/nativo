"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if still loading auth state
    if (loading) return;

    // Allow access to landing page (root) without authentication
    if (pathname === "/" || pathname === "") return;

    // If not authenticated and trying to access protected routes, redirect to landing
    if (!user) {
      router.push("/");
      return;
    }
  }, [user, loading, pathname, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.1rem',
        color: 'var(--text-muted)'
      }}>
        Loading...
      </div>
    );
  }

  // If not authenticated and not on landing page, show loading while redirecting
  if (!user && pathname !== "/" && pathname !== "") {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.1rem',
        color: 'var(--text-muted)'
      }}>
        Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}