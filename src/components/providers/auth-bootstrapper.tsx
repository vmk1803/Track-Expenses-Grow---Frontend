"use client";

import { useEffect, useRef } from "react";
import { authService } from "@/features/auth/services/auth-service";
import {
  rehydrateSession,
  sessionRevoked,
  tokensRefreshed,
} from "@/features/auth/state/auth-slice";
import { rehydrateProfile } from "@/features/personalization/state/personalization-slice";
import { readStoredProfile } from "@/features/personalization/utils/personalization-storage";
import { registerAuthBridge } from "@/lib/api/auth-bridge";
import { useAppDispatch } from "@/lib/store/hooks";

export function AuthBootstrapper() {
  const dispatch = useAppDispatch();
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;

    registerAuthBridge({
      refresh: async () => {
        const session = await authService.refresh();
        return { accessToken: session.accessToken };
      },
      onTokensRefreshed: (session) => {
        dispatch(tokensRefreshed(session));
      },
      onRefreshFailure: () => {
        dispatch(sessionRevoked());
      },
    });

    void dispatch(rehydrateSession());
    dispatch(rehydrateProfile(readStoredProfile()));
  }, [dispatch]);

  return null;
}
