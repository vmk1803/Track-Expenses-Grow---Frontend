"use client";

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { logout } from "@/features/auth/state/auth-slice";
import { personalizationService } from "@/features/personalization/services/personalization-service";
import type { PersonalizationProfile } from "@/features/personalization/types/personalization";
import type { RuleCatalog } from "@/features/personalization/types/rule-catalog";
import {
  clearStoredProfile,
  writeStoredProfile,
} from "@/features/personalization/utils/personalization-storage";
import { ApiError } from "@/lib/api/http-client";
import type { RootState } from "@/lib/store/store";

type CatalogStatus = "idle" | "loading" | "ready" | "error";

type PersonalizationState = {
  savedProfile: PersonalizationProfile | null;
  catalog: RuleCatalog | null;
  catalogStatus: CatalogStatus;
  catalogError: string | null;
};

const initialState: PersonalizationState = {
  savedProfile: null,
  catalog: null,
  catalogStatus: "idle",
  catalogError: null,
};

type CatalogErrorPayload = { message: string };

function normalizeCatalogError(error: unknown): CatalogErrorPayload {
  if (error instanceof ApiError) {
    return { message: error.message };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Unable to load the rule catalog right now." };
}

export const loadRuleCatalog = createAsyncThunk<
  RuleCatalog,
  void,
  { state: RootState; rejectValue: CatalogErrorPayload }
>(
  "personalization/loadRuleCatalog",
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.accessToken;
    if (!token) {
      return rejectWithValue({
        message: "Sign in again to load the rule catalog.",
      });
    }
    try {
      return await personalizationService.getRuleCatalog(token);
    } catch (error) {
      return rejectWithValue(normalizeCatalogError(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = getState().personalization.catalogStatus;
      return status !== "loading" && status !== "ready";
    },
  }
);

const personalizationSlice = createSlice({
  name: "personalization",
  initialState,
  reducers: {
    saveProfile(state, action: PayloadAction<PersonalizationProfile>) {
      state.savedProfile = action.payload;
      writeStoredProfile(action.payload);
    },
    rehydrateProfile(
      state,
      action: PayloadAction<PersonalizationProfile | null>
    ) {
      state.savedProfile = action.payload;
    },
    clearProfile(state) {
      state.savedProfile = null;
      clearStoredProfile();
    },
  },
  extraReducers: (builder) => {
    const handleLogout = (state: PersonalizationState) => {
      state.savedProfile = null;
      state.catalog = null;
      state.catalogStatus = "idle";
      state.catalogError = null;
      clearStoredProfile();
    };

    builder
      .addCase(logout.pending, handleLogout)
      .addCase(logout.fulfilled, handleLogout)
      .addCase(logout.rejected, handleLogout)
      .addCase(loadRuleCatalog.pending, (state) => {
        state.catalogStatus = "loading";
        state.catalogError = null;
      })
      .addCase(loadRuleCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload;
        state.catalogStatus = "ready";
        state.catalogError = null;
      })
      .addCase(loadRuleCatalog.rejected, (state, action) => {
        state.catalogStatus = "error";
        state.catalogError =
          action.payload?.message ?? "Unable to load the rule catalog.";
      });
  },
});

export const { saveProfile, rehydrateProfile, clearProfile } =
  personalizationSlice.actions;

export const personalizationReducer = personalizationSlice.reducer;
