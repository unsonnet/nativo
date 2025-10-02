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
  const username = tokenService.resetUsername; // if needed
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
    if (body.accessToken && body.idToken) {
      tokenService.set({ idToken: body.idToken, accessToken: body.accessToken, refreshToken });
    }
    return makeResponse(res.status, !!body?.accessToken);
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
    return fn(headers);
  }

  const r = await refresh();
  if (!r.body) {
    // refresh failed
    return { status: r.status, body: (null as unknown) as T, error: r.error };
  }

  const refreshed = tokenService.idToken;
  const headers: Partial<Record<string, string>> = refreshed ? { Authorization: `Bearer ${refreshed}` } : {};
  return fn(headers);
}
