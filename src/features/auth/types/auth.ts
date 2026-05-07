export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  fullName: string;
  email: string;
  password: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type LogoutRequest = {
  refreshToken: string;
};

export type AuthFormMode = "login" | "signup";

export type AuthStatus =
  | "idle"
  | "bootstrapping"
  | "authenticated"
  | "anonymous"
  | "submitting";

export type ApiIssue = {
  path: string;
  message: string;
};

export type ApiErrorResponse = {
  message: string;
  issues?: ApiIssue[];
};

export type AuthErrorPayload = {
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
};

export type LoginFormValues = LoginRequest;

export type SignupFormValues = SignupRequest & {
  confirmPassword: string;
};
