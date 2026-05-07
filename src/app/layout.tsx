import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { env } from "@/config/env";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: env.appName,
    template: `%s | ${env.appName}`,
  },
  description:
    "Track expenses, manage budgets, and prepare for AI guidance in a focused personal finance workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
