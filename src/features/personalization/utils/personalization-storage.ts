import type { PersonalizationProfile } from "@/features/personalization/types/personalization";

const STORAGE_KEY = "track-expenses-grow.personalizationProfile.v2";
const LEGACY_STORAGE_KEY = "track-expenses-grow.personalizationProfile";

function isValidProfile(value: unknown): value is PersonalizationProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersonalizationProfile>;
  return (
    Boolean(candidate.inputs) &&
    Boolean(candidate.recommendation) &&
    Array.isArray(candidate.allocations) &&
    typeof candidate.savedAt === "string"
  );
}

export function readStoredProfile(): PersonalizationProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Best-effort cleanup of the v1 entry — its shape lacks `allocations` and
  // would lead to a broken pre-fill if loaded back into the v2 code.
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidProfile(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredProfile(profile: PersonalizationProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearStoredProfile(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}
