"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, AuthState } from "./types";
import { tokenService, parseJwtPayload } from "./token";
import { login as authLogin, refresh as authRefresh } from "./auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithDummy: () => void;
  signIn: (username: string, password: string) => Promise<{ ok: boolean; status: number }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DUMMY_USER: User = {
  id: "dev-user-1",
  name: "Jane Developer",
  email: "jane.developer@example.com",
  avatarUrl: undefined,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated to indicate client-side has taken over
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Only run initialization on the client side after hydration
      if (!isHydrated) return;

      // If tokens are present and valid, parse idToken and set user
      const tokens = tokenService.all;
      if (tokens && !tokenService.expired) {
        const claims = parseJwtPayload<Record<string, unknown>>(tokens.idToken);
        if (claims && mounted) {
          setState({
            user: {
              id: String(claims.sub ?? ""),
              name: String(claims.name ?? claims['cognito:username'] ?? ""),
              email: typeof claims.email === "string" ? claims.email : undefined,
            },
            loading: false,
          });
          return;
        }
      }

      // If refresh token exists try to refresh
      if (tokenService.refreshToken) {
        const r = await authRefresh();
        if (r.body && tokenService.idToken) {
          const claims = parseJwtPayload<Record<string, unknown>>(tokenService.idToken as string);
          if (claims && mounted) {
            setState({
              user: {
                id: String(claims.sub ?? ""),
                name: String(claims.name ?? claims['cognito:username'] ?? ""),
                email: typeof claims.email === "string" ? claims.email : undefined,
              },
              loading: false,
            });
            return;
          }
        }
      }

      // Fallback: in development, provide a dummy user for convenience
      // Only set dummy user on client side in development
      if (typeof window !== 'undefined' && process.env.NODE_ENV === "development") {
        setState({ user: DUMMY_USER, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [isHydrated]); // Depend on isHydrated to re-run when client takes over

  async function signIn(username: string, password: string) {
    setState((s) => ({ ...s, loading: true }));
    const res = await authLogin(username, password);
    if (res.status === 200) {
      // successful login — read idToken for user
      const idToken = tokenService.idToken;
      const claims = idToken ? parseJwtPayload<Record<string, unknown>>(idToken) : null;
      if (claims) {
        setState({
          user: {
            id: String(claims.sub ?? ""),
            name: String(claims.name ?? claims['cognito:username'] ?? username),
            email: typeof claims.email === "string" ? claims.email : undefined,
          },
          loading: false,
        });
      } else {
        setState({ user: null, loading: false });
      }
      return { ok: true, status: res.status };
    }

    // handle reset or denied
    setState((s) => ({ ...s, loading: false }));
    return { ok: false, status: res.status };
  }

  function signInWithDummy() {
    setState({ user: DUMMY_USER, loading: false });
  }

  function signOut() {
    tokenService.clear();
    setState({ user: null, loading: false });
  }

  return (
    <AuthContext.Provider
      value={{ user: state.user, loading: state.loading, signInWithDummy, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
}
