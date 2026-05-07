"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status === "anonymous") {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/${next}`);
    }
  }, [pathname, router, status]);

  if (status === "idle" || status === "bootstrapping" || status === "submitting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-surface px-8 py-6 text-center shadow-[0_24px_80px_rgba(13,20,33,0.12)]">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
          <p className="text-sm font-medium text-copy-muted">
            Restoring your session...
          </p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
