type RefreshedSession = {
  accessToken: string;
};

type AuthBridge = {
  refresh: () => Promise<RefreshedSession>;
  onTokensRefreshed: (session: RefreshedSession) => void;
  onRefreshFailure: () => void;
};

let bridge: AuthBridge | null = null;
let inflight: Promise<RefreshedSession | null> | null = null;

export function registerAuthBridge(next: AuthBridge) {
  bridge = next;
}

export async function refreshAccessToken(): Promise<RefreshedSession | null> {
  if (!bridge) {
    return null;
  }

  if (inflight) {
    return inflight;
  }

  const current = bridge;

  inflight = (async () => {
    try {
      const session = await current.refresh();
      current.onTokensRefreshed(session);
      return session;
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
