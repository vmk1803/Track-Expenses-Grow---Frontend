import { AuthScreen } from "@/features/auth/components/auth-screen";

type HomePageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParam = resolvedSearchParams?.next;
  const nextPath =
    typeof nextParam === "string" && nextParam.startsWith("/")
      ? nextParam
      : "/dashboard/overview";

  return <AuthScreen nextPath={nextPath} />;
}
