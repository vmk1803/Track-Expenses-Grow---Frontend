"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthError, login, signup } from "@/features/auth/state/auth-slice";
import {
  validateLogin,
  validateSignup,
} from "@/features/auth/schemas/auth-schemas";
import type {
  AuthErrorPayload,
  AuthFormMode,
  LoginFormValues,
  SignupFormValues,
} from "@/features/auth/types/auth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";

function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        {...props}
        className={cn(
          "h-12 w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
        )}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </label>
  );
}

const defaultLoginValues: LoginFormValues = {
  email: "",
  password: "",
};

const defaultSignupValues: SignupFormValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function AuthScreen({ nextPath }: { nextPath: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const status = useAppSelector((state) => state.auth.status);
  const authError = useAppSelector((state) => state.auth.error);
  const isAuthenticated = useAppSelector(
    (state) => state.auth.status === "authenticated"
  );

  const [mode, setMode] = useState<AuthFormMode>("login");
  const [loginValues, setLoginValues] =
    useState<LoginFormValues>(defaultLoginValues);
  const [signupValues, setSignupValues] =
    useState<SignupFormValues>(defaultSignupValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, router]);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch, mode]);

  const isBusy = status === "submitting" || status === "bootstrapping";

  const handleModeSwitch = (nextMode: AuthFormMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setLocalError(null);
  };

  const handleRejected = (error: unknown) => {
    const payload = error as AuthErrorPayload;
    setLocalError(payload.message);
    setFieldErrors(payload.fieldErrors ?? {});
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLocalError(null);

    const result = validateLogin(loginValues);

    if (!result.success) {
      setFieldErrors(result.fieldErrors);
      return;
    }

    try {
      await dispatch(login(loginValues)).unwrap();
      router.replace(nextPath);
    } catch (error) {
      handleRejected(error);
    }
  };

  const handleSignupSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFieldErrors({});
    setLocalError(null);

    const result = validateSignup(signupValues);

    if (!result.success) {
      setFieldErrors(result.fieldErrors);
      return;
    }

    try {
      await dispatch(
        signup({
          fullName: signupValues.fullName.trim(),
          email: signupValues.email.trim(),
          password: signupValues.password,
        })
      ).unwrap();
      router.replace(nextPath);
    } catch (error) {
      handleRejected(error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,120,97,0.18),_transparent_34%),linear-gradient(180deg,#f6f1e8_0%,#f1ece1_100%)] text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white shadow-[0_16px_34px_rgba(0,120,97,0.32)]">
            TG
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-brand-strong">
              FINANCIAL GROWTH SUPPORT
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              Track Expenses &amp; Grow
            </h1>
          </div>
        </div>

        <p className="hidden text-sm text-copy-muted md:block">
          Budget with clarity. Grow with confidence.
        </p>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-7xl items-center justify-center px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="hidden rounded-[32px] border border-white/45 bg-white/50 p-10 shadow-[0_28px_90px_rgba(13,20,33,0.1)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <div className="inline-flex w-fit items-center rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-brand-strong">
                Phase 1 frontend foundation
              </div>
              <div className="space-y-4">
                <h2 className="max-w-lg text-5xl font-semibold leading-[1.05] text-foreground">
                  Keep your money story simple, visible, and actionable.
                </h2>
                <p className="max-w-xl text-base leading-7 text-copy-muted">
                  A calm finance workspace for tracking expenses, planning
                  budgets, and preparing for AI guidance without the clutter.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                "Single-card login and signup flow",
                "Secure token persistence with Redux hydration",
                "Protected dashboard ready for the next modules",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-border/70 bg-surface px-5 py-5"
                >
                  <p className="text-sm font-medium leading-6 text-foreground">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto flex w-full max-w-xl items-center justify-center">
            <div className="w-full rounded-[32px] border border-white/65 bg-white/82 p-6 shadow-[0_28px_120px_rgba(13,20,33,0.14)] backdrop-blur sm:p-8">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </p>
                <h2 className="text-3xl font-semibold text-foreground">
                  {mode === "login"
                    ? "Login to continue"
                    : "Start your finance workspace"}
                </h2>
                <p className="text-sm leading-6 text-copy-muted">
                  {mode === "login"
                    ? "Use your email and password to access your dashboard."
                    : "Sign up once and you will be logged in immediately."}
                </p>
              </div>

              <div className="mt-6 inline-flex rounded-full border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => handleModeSwitch("login")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    mode === "login"
                      ? "bg-foreground text-white"
                      : "text-copy-muted"
                  )}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("signup")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    mode === "signup"
                      ? "bg-foreground text-white"
                      : "text-copy-muted"
                  )}
                >
                  Signup
                </button>
              </div>

              {(localError || authError) && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {localError || authError}
                </div>
              )}

              {mode === "login" ? (
                <form className="mt-6 space-y-5" onSubmit={handleLoginSubmit}>
                  <Field
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={loginValues.email}
                    error={fieldErrors.email}
                    onChange={(event) =>
                      setLoginValues((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                  <Field
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={loginValues.password}
                    error={fieldErrors.password}
                    onChange={(event) =>
                      setLoginValues((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white shadow-[0_18px_38px_rgba(0,120,97,0.28)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy ? "Signing you in..." : "Login"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch("signup")}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition hover:border-brand/40 hover:text-brand"
                  >
                    Create an account
                  </button>
                </form>
              ) : (
                <form className="mt-6 space-y-5" onSubmit={handleSignupSubmit}>
                  <Field
                    label="Full name"
                    type="text"
                    placeholder="Your full name"
                    autoComplete="name"
                    value={signupValues.fullName}
                    error={fieldErrors.fullName}
                    onChange={(event) =>
                      setSignupValues((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                  />
                  <Field
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={signupValues.email}
                    error={fieldErrors.email}
                    onChange={(event) =>
                      setSignupValues((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                  <Field
                    label="Password"
                    type="password"
                    placeholder="At least 8 chars, with upper/lower/number"
                    autoComplete="new-password"
                    value={signupValues.password}
                    error={fieldErrors.password}
                    onChange={(event) =>
                      setSignupValues((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                  <Field
                    label="Confirm password"
                    type="password"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={signupValues.confirmPassword}
                    error={fieldErrors.confirmPassword}
                    onChange={(event) =>
                      setSignupValues((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white shadow-[0_18px_38px_rgba(0,120,97,0.28)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy ? "Creating your account..." : "Create account"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch("login")}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition hover:border-brand/40 hover:text-brand"
                  >
                    Back to login
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
