import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Overview was merged into Expenses; keep old bookmarks and
        // in-flight `?next=/dashboard/overview` logins working.
        source: "/dashboard/overview",
        destination: "/dashboard/expenses",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
