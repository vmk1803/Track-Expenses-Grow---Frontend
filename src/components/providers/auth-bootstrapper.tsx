"use client";

import { useEffect, useRef } from "react";
import { authService } from "@/features/auth/services/auth-service";
import {
  markAnonymous,
  rehydrateSession,
  sessionRevoked,
  setBootstrapping,
  tokensRefreshed,
} from "@/features/auth/state/auth-slice";
import { registerAuthBridge } from "@/lib/api/auth-bridge";
import { useAppDispatch, useAppStore } from "@/lib/store/hooks";
import { getStoredRefreshToken } from "@/lib/utils/auth-storage";

export function AuthBootstrapper() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;

    registerAuthBridge({
      getRefreshToken: () => store.getState().auth.refreshToken,
      refresh: async (refreshToken) => {
        const session = await authService.refresh({ refreshToken });
        return {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        };
      },
      onTokensRefreshed: (tokens) => {
        dispatch(tokensRefreshed(tokens));
      },
      onRefreshFailure: () => {
        dispatch(sessionRevoked());
      },
    });

    const refreshToken = getStoredRefreshToken();

    if (!refreshToken) {
      dispatch(markAnonymous());
      return;
    }

    dispatch(setBootstrapping());
    void dispatch(rehydrateSession(refreshToken));
  }, [dispatch, store]);

  return null;
}
