/**
 * Minimal token storage and parsing utilities.
 * Uses localStorage for persistence in the browser.
 */
import type { AuthTokens } from "./types";

const TOKENS_KEY = "k9:auth:tokens";
const RESET_KEY = "k9:auth:reset";

export function parseJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export class TokenService {
  private isClient = typeof window !== 'undefined';

  set(tokens: AuthTokens) {
    if (!this.isClient) return;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    localStorage.removeItem(RESET_KEY);
  }

  setResetSession(username: string, session: string) {
    if (!this.isClient) return;
    localStorage.setItem(RESET_KEY, JSON.stringify({ username, session }));
    localStorage.removeItem(TOKENS_KEY);
  }

  clear() {
    if (!this.isClient) return;
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(RESET_KEY);
  }

  clearResetSession() {
    if (!this.isClient) return;
    localStorage.removeItem(RESET_KEY);
  }

  get all(): AuthTokens | null {
    if (!this.isClient) return null;
    const v = localStorage.getItem(TOKENS_KEY);
    return v ? JSON.parse(v) : null;
  }

  get accessToken(): string | null {
    return this.all?.accessToken ?? null;
  }

  get idToken(): string | null {
    return this.all?.idToken ?? null;
  }

  get refreshToken(): string | null {
    return this.all?.refreshToken ?? null;
  }

  get resetSession(): string | null {
    if (!this.isClient) return null;
    const v = localStorage.getItem(RESET_KEY);
    if (!v) return null;
    try {
      return JSON.parse(v).session;
    } catch {
      return null;
    }
  }

  get resetUsername(): string | null {
    if (!this.isClient) return null;
    const v = localStorage.getItem(RESET_KEY);
    if (!v) return null;
    try {
      return JSON.parse(v).username;
    } catch {
      return null;
    }
  }

  get expired(): boolean {
    const token = this.accessToken;
    if (!token) return true;
    const payload = parseJwtPayload<{ exp?: number }>(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  }

  get invalid(): boolean {
    if (!this.idToken || !this.accessToken) return true;
    if (this.expired && !this.refreshToken) return true;
    return false;
  }
}

export const tokenService = new TokenService();
