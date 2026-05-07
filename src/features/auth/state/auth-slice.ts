"use client";

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { authService } from "@/features/auth/services/auth-service";
import type {
  AuthErrorPayload,
  AuthSessionResponse,
  AuthStatus,
  AuthUser,
  LoginRequest,
  SignupRequest,
} from "@/features/auth/types/auth";
import { ApiError } from "@/lib/api/http-client";
import {
  clearStoredTokens,
  setStoredTokens,
} from "@/lib/utils/auth-storage";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};

const initialState: AuthState = {
  status: "idle",
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,
};

function normalizeError(error: unknown): AuthErrorPayload {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      fieldErrors:
        Object.keys(error.fieldErrors).length > 0 ? error.fieldErrors : undefined,
      status: error.status,
    };
  }

  return {
    message: "Unable to complete the request right now.",
  };
}

function persistSession(state: AuthState, payload: AuthSessionResponse) {
  state.status = "authenticated";
  state.user = payload.user;
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken;
  state.error = null;
  setStoredTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
}

function clearSession(state: AuthState, error: string | null = null) {
  state.status = "anonymous";
  state.user = null;
  state.accessToken = null;
  state.refreshToken = null;
  state.error = error;
  clearStoredTokens();
}

export const login = createAsyncThunk<
  AuthSessionResponse,
  LoginRequest,
  { rejectValue: AuthErrorPayload }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    return await authService.loginWithCredentials(payload);
  } catch (error) {
    return rejectWithValue(normalizeError(error));
  }
});

export const signup = createAsyncThunk<
  AuthSessionResponse,
  SignupRequest,
  { rejectValue: AuthErrorPayload }
>("auth/signup", async (payload, { rejectWithValue }) => {
  try {
    return await authService.signup(payload);
  } catch (error) {
    return rejectWithValue(normalizeError(error));
  }
});

export const rehydrateSession = createAsyncThunk<
  AuthSessionResponse,
  string,
  { rejectValue: AuthErrorPayload }
>("auth/rehydrateSession", async (refreshToken, { rejectWithValue }) => {
  try {
    return await authService.refresh({ refreshToken });
  } catch (error) {
    return rejectWithValue(normalizeError(error));
  }
});

export const logout = createAsyncThunk<void, void, { state: { auth: AuthState } }>(
  "auth/logout",
  async (_, { getState }) => {
    const refreshToken = getState().auth.refreshToken;
    if (!refreshToken) {
      return;
    }

    try {
      await authService.logout({ refreshToken });
    } catch {
      // Best-effort revocation. Local state is cleared regardless.
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    markAnonymous(state) {
      clearSession(state);
    },
    clearAuthError(state) {
      state.error = null;
    },
    setBootstrapping(state) {
      state.status = "bootstrapping";
      state.error = null;
    },
    tokensRefreshed(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      setStoredTokens(action.payload);
    },
    sessionRevoked(state) {
      clearSession(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "submitting";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        persistSession(state, action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "anonymous";
        state.error =
          action.payload?.message ?? "Unable to log you in right now.";
      })
      .addCase(signup.pending, (state) => {
        state.status = "submitting";
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        persistSession(state, action.payload);
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = "anonymous";
        state.error =
          action.payload?.message ?? "Unable to create your account right now.";
      })
      .addCase(rehydrateSession.pending, (state) => {
        state.status = "bootstrapping";
        state.error = null;
      })
      .addCase(rehydrateSession.fulfilled, (state, action) => {
        persistSession(state, action.payload);
      })
      .addCase(rehydrateSession.rejected, (state, action) => {
        clearSession(state, action.payload?.message ?? null);
      })
      .addCase(logout.pending, (state) => {
        clearSession(state);
      })
      .addCase(logout.fulfilled, (state) => {
        clearSession(state);
      })
      .addCase(logout.rejected, (state) => {
        clearSession(state);
      });
  },
});

export const {
  markAnonymous,
  clearAuthError,
  setBootstrapping,
  tokensRefreshed,
  sessionRevoked,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
