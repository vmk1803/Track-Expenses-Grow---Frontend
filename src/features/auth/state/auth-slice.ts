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

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  error: string | null;
};

const initialState: AuthState = {
  status: "idle",
  user: null,
  accessToken: null,
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
  state.error = null;
}

function clearSession(state: AuthState, error: string | null = null) {
  state.status = "anonymous";
  state.user = null;
  state.accessToken = null;
  state.error = error;
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
  void,
  { rejectValue: AuthErrorPayload }
>("auth/rehydrateSession", async (_, { rejectWithValue }) => {
  try {
    return await authService.refresh();
  } catch (error) {
    return rejectWithValue(normalizeError(error));
  }
});

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await authService.logout();
  } catch {
    // Best-effort revocation. Local state is cleared regardless.
  }
});

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
      action: PayloadAction<{ accessToken: string }>
    ) {
      state.accessToken = action.payload.accessToken;
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
      .addCase(rehydrateSession.rejected, (state) => {
        // No cookie / expired cookie on first paint isn't a user-facing error.
        clearSession(state);
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
