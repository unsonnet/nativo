import { tokenService } from "./token";
import type { AuthTokens, K9Response } from "./types";
import { LoginStatus } from "./types";

// Use the original API base URL for authentication
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth`
  : "https://824xuvy567.execute-api.us-east-2.amazonaws.com/securek9/auth";

function makeResponse<T>(status: number, body: T, error?: string): K9Response<T> {
  return { status, body, error };
}

export async function login(
  username: string,
  password: string,
): Promise<K9Response<LoginStatus>> {
  const url = `${BASE}/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = (await res.json()) ?? {};

    if (res.status === 200 && body.accessToken && body.idToken) {
      const tokens: AuthTokens = {
        idToken: body.idToken,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        username: username, // Store username for refresh operations
      };
      tokenService.set(tokens);
      return makeResponse(200, LoginStatus.SUCCESS);
    }

    if (res.status === 202 && body.session && body.username) {
      tokenService.setResetSession(body.username, body.session);
      return makeResponse(202, LoginStatus.RESET);
    }

    return makeResponse(res.status, LoginStatus.DENIED, body?.message ?? "");
  } catch (err: unknown) {
    const maybe = err as Record<string, unknown> | undefined;
    const msg = maybe && typeof maybe === "object" && "message" in maybe && typeof maybe.message === "string" ? maybe.message : String(err);
    return makeResponse(500, LoginStatus.DENIED, msg);
  }
}

export async function reset(newPassword: string): Promise<K9Response<boolean>> {
  const session = tokenService.resetSession;
  const username = tokenService.resetUsername;
  if (!session || !username) {
    return makeResponse(400, false, "Missing session or username");
  }

  const url = `${BASE}/reset`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, newPassword, session }),
    });
    if (res.ok) {
      tokenService.clearResetSession();
    }
    return makeResponse(res.status, res.status === 200);
  } catch (err: unknown) {
    const maybe = err as Record<string, unknown> | undefined;
    const msg = maybe && typeof maybe === "object" && "message" in maybe && typeof maybe.message === "string" ? maybe.message : String(err);
    return makeResponse(500, false, msg);
  }
}

export async function refresh(): Promise<K9Response<boolean>> {
  const refreshToken = tokenService.refreshToken;
  const username = tokenService.username; // Use stored username from login
  if (!refreshToken || !username) {
    return makeResponse(401, false, "Missing refresh token or username");
  }

  const url = `${BASE}/refresh`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, username }),
    });
    const body = (await res.json()) ?? {};
    
    if (res.status === 200 && body.accessToken && body.idToken) {
      tokenService.set({ 
        idToken: body.idToken, 
        accessToken: body.accessToken, 
        refreshToken: refreshToken, // Your API doesn't return new refresh token
        username: username // Preserve username
      });
      return makeResponse(200, true);
    }
    
    // If refresh failed, clear tokens
    if (res.status === 401 || res.status === 403) {
      tokenService.clear();
    }
    
    return makeResponse(res.status, false, body?.message || "Token refresh failed");
  } catch (err: unknown) {
    const maybe = err as Record<string, unknown> | undefined;
    const msg = maybe && typeof maybe === "object" && "message" in maybe && typeof maybe.message === "string" ? maybe.message : String(err);
    return makeResponse(500, false, msg);
  }
}

export async function withAuthHeaders<T>(
  fn: (headers: Partial<Record<string, string>>) => Promise<K9Response<T>>,
): Promise<K9Response<T>> {
  const token = tokenService.idToken;

  if (token && !tokenService.expired) {
    const headers: Partial<Record<string, string>> = { Authorization: `Bearer ${token}` };
    const result = await fn(headers);
    
    // If we get a 401, the token might be invalid on the server side
    if (result.status === 401) {
      // Try to refresh the token
      const refreshResult = await refresh();
      if (refreshResult.body) {
        // Retry with new token
        const newToken = tokenService.idToken;
        if (newToken) {
          const newHeaders: Partial<Record<string, string>> = { Authorization: `Bearer ${newToken}` };
          return fn(newHeaders);
        }
      }
      // If refresh failed, clear tokens and return the 401
      tokenService.clear();
    }
    
    return result;
  }

  // Token is expired or missing, try to refresh
  const refreshResult = await refresh();
  if (!refreshResult.body) {
    // Refresh failed, clear tokens and return auth error
    tokenService.clear();
    return { 
      status: refreshResult.status, 
      body: (null as unknown) as T, 
      error: refreshResult.error || "Authentication failed" 
    };
  }

  // Use refreshed token
  const refreshedToken = tokenService.idToken;
  const headers: Partial<Record<string, string>> = refreshedToken ? 
    { Authorization: `Bearer ${refreshedToken}` } : {};
  return fn(headers);
}
