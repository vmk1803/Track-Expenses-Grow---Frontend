import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/features/auth/state/auth-slice";
import { personalizationReducer } from "@/features/personalization/state/personalization-slice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      personalization: personalizationReducer,
    },
  });
}

export const store = makeStore();

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
