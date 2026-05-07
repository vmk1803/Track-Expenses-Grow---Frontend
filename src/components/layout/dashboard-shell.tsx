"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/features/auth/state/auth-slice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/income", label: "Income" },
  { href: "/dashboard/ai-advice", label: "AI Advice" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    void dispatch(logout());
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,120,97,0.28)]">
              TG
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Track Expenses &amp; Grow
              </p>
              <p className="text-xs text-copy-muted">
                Welcome back{user ? `, ${user.fullName.split(" ")[0]}` : ""}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:border-brand/50 hover:text-brand"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap gap-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-w-28 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "border-brand-strong bg-brand-strong text-white shadow-[0_14px_32px_rgba(13,93,77,0.28)]"
                    : "border-border bg-surface text-copy-muted hover:border-brand/40 hover:text-brand"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </main>
    </div>
  );
}
