import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Track Expenses & Grow"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid frontend environment configuration:\n${issues}`);
}

export const env = {
  appName: parsed.data.NEXT_PUBLIC_APP_NAME,
  apiBaseUrl: parsed.data.NEXT_PUBLIC_API_BASE_URL,
} as const;

export type PublicEnv = typeof env;
