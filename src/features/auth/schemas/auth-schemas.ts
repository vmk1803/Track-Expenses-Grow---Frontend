import { z } from "zod";
import type {
  LoginFormValues,
  SignupFormValues,
} from "@/features/auth/types/auth";

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

export const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export const signupFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(80, "Full name must be at most 80 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: passwordRules,
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  );
}

export function validateLogin(values: LoginFormValues) {
  const result = loginFormSchema.safeParse(values);

  if (result.success) {
    return { success: true as const, fieldErrors: {} };
  }

  return {
    success: false as const,
    fieldErrors: toFieldErrors(result.error.issues),
  };
}

export function validateSignup(values: SignupFormValues) {
  const result = signupFormSchema.safeParse(values);

  if (result.success) {
    return { success: true as const, fieldErrors: {} };
  }

  return {
    success: false as const,
    fieldErrors: toFieldErrors(result.error.issues),
  };
}
