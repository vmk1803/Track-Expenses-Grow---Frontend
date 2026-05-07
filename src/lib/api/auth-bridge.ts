type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthBridge = {
  getRefreshToken: () => string | null;
  refresh: (refreshToken: string) => Promise<RefreshedTokens>;
  onTokensRefreshed: (tokens: RefreshedTokens) => void;
  onRefreshFailure: () => void;
};

let bridge: AuthBridge | null = null;
let inflight: Promise<RefreshedTokens | null> | null = null;

export function registerAuthBridge(next: AuthBridge) {
  bridge = next;
}

export async function refreshAccessToken(): Promise<RefreshedTokens | null> {
  if (!bridge) {
    return null;
  }

  if (inflight) {
    return inflight;
  }

  const current = bridge;
  const refreshToken = current.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  inflight = (async () => {
    try {
      const tokens = await current.refresh(refreshToken);
      current.onTokensRefreshed(tokens);
      return tokens;
    } catch (error) {
      current.onRefreshFailure();
      throw error;
    } finally {
      inflight = null;
    }
  })();

  try {
    return await inflight;
  } catch {
    return null;
  }
}
