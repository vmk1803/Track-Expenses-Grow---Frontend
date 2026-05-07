"use client";

import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { AuthBootstrapper } from "@/components/providers/auth-bootstrapper";
import { store } from "@/lib/store/store";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrapper />
      {children}
    </Provider>
  );
}
