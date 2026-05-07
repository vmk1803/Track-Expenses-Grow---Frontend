const ACCESS_TOKEN_KEY = "track-expenses-grow.accessToken";
const REFRESH_TOKEN_KEY = "track-expenses-grow.refreshToken";

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setStoredTokens(tokens: { accessToken: string; refreshToken: string }) {
  setStoredAccessToken(tokens.accessToken);
  setStoredRefreshToken(tokens.refreshToken);
}

export function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
