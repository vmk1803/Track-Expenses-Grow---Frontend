import { apiRequest } from "@/lib/api/http-client";
import type {
  AuthSessionResponse,
  LoginRequest,
  SignupRequest,
} from "@/features/auth/types/auth";

export const authService = {
  loginWithCredentials(payload: LoginRequest) {
    return apiRequest<AuthSessionResponse>("/auth/login", {
      method: "POST",
      body: payload,
      skipAuthRefresh: true,
    });
  },
  signup(payload: SignupRequest) {
    return apiRequest<AuthSessionResponse>("/auth/signup", {
      method: "POST",
      body: payload,
      skipAuthRefresh: true,
    });
  },
  refresh() {
    return apiRequest<AuthSessionResponse>("/auth/refresh", {
      method: "POST",
      skipAuthRefresh: true,
    });
  },
  logout() {
    return apiRequest<void>("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
  },
};
