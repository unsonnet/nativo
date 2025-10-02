export type User = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type AuthState = {
  user: User | null;
  loading: boolean;
};

// Tokens and response types for the auth service
export type AuthTokens = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  username?: string; // Store username for refresh operations
};

export type K9Response<T> = {
  status: number;
  body: T;
  error?: string;
};

export enum LoginStatus {
  SUCCESS = "SUCCESS",
  RESET = "RESET",
  DENIED = "DENIED",
}
