"use client";

import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, loading, signInWithDummy, signOut } = useAuth();

  return (
    <header className="app-header">
      <h1 className="app-header__title">FloorPlan Reports</h1>

      <div className="app-header__user">
        {loading ? (
          <span className="app-header__name">Loading…</span>
        ) : user ? (
          <>
            <span className="app-header__name">{user.name}</span>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sign out"
              className="app-header__avatar"
            />
          </>
        ) : (
          <>
            <span className="app-header__name">Guest</span>
            <button
              type="button"
              onClick={() => signInWithDummy()}
              title="Sign in (dev)"
              className="app-header__avatar"
            />
          </>
        )}
      </div>
    </header>
  );
}
