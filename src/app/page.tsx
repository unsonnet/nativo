"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading, signInWithDummy } = useAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Track mount state for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (mounted && !loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router, mounted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      // For now, use dummy login - later you can replace with real auth
      signInWithDummy();
      router.push("/dashboard");
    } catch {
      setLoginError("Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Show loading while checking auth state or before mount
  if (!mounted || loading) {
    return (
      <div className="landing-page">
        <div className="landing-page__container">
          <div className="landing-page__logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9h6v6H9z" fill="currentColor"/>
            </svg>
          </div>
          <div className="landing-page__loading">Loading...</div>
        </div>
      </div>
    );
  }

  // Show landing page if not logged in and mounted
  if (!user) {
    return (
      <div className={`landing-page ${showLogin ? 'landing-page--with-form' : ''}`}>
        <div className={`landing-page__container ${showLogin ? 'landing-page__container--login' : ''}`}>
          <div className="landing-page__logo">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9h6v6H9z" fill="currentColor"/>
            </svg>
            <h1 className="landing-page__company-name">K9 Search</h1>
          </div>

          <div className="landing-page__content">
            <div className="landing-page__welcome">
              <p className="landing-page__description">
                Like, kind, and quality flooring discovery using photo recognition technology.
              </p>
              <button 
                onClick={() => setShowLogin(true)}
                className="landing-page__login-button"
              >
                Get Started
              </button>
            </div>

            <div className="landing-page__login-form">
              <h2 className="landing-page__login-title">Welcome Back</h2>
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-form__field">
                  <label htmlFor="username" className="login-form__label">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="login-form__input"
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="login-form__field">
                  <label htmlFor="password" className="login-form__label">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="login-form__input"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                {loginError && (
                  <div className="login-form__error">{loginError}</div>
                )}
                <div className="login-form__actions">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="login-form__button login-form__button--secondary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="login-form__button login-form__button--primary"
                  >
                    {loginLoading ? "Signing In..." : "Sign In"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return null;
}
