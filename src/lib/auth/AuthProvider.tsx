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
  id: "demo-user-1",
  name: "Demo User",
  email: "demo@k9search.com",
  avatarUrl: undefined,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as hydrated to indicate client-side has taken over
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function init() {
      // Only run initialization on the client side after hydration
      if (!isMounted) return;

      try {
        // If tokens are present and valid, parse idToken and set user
        const tokens = tokenService.all;
        if (tokens && !tokenService.expired) {
          const claims = parseJwtPayload<Record<string, unknown>>(tokens.idToken);
          if (claims && !isCancelled) {
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

        // If refresh token exists try to refresh with timeout
        if (tokenService.refreshToken) {
          try {
            const refreshPromise = authRefresh();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Refresh timeout')), 5000)
            );
            
            const r = await Promise.race([refreshPromise, timeoutPromise]);
            if (r && typeof r === 'object' && 'body' in r && r.body && tokenService.idToken) {
              const claims = parseJwtPayload<Record<string, unknown>>(tokenService.idToken as string);
              if (claims && !isCancelled) {
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
          } catch (refreshError) {
            console.log('Refresh failed or timed out:', refreshError);
            // Continue to fallback
          }
        }

        // Fallback: no user logged in
        if (!isCancelled) {
          setState({ user: null, loading: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Ensure we always set loading to false even if something goes wrong
        if (!isCancelled) {
          setState({ user: null, loading: false });
        }
      }
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, [isMounted]);

  async function signIn(username: string, password: string) {
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
