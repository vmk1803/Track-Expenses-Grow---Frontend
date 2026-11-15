import { apiRequest } from "@/lib/api/http-client";
import type { RuleCatalogResponse } from "@/features/personalization/types/rule-catalog";

export const personalizationService = {
  getRuleCatalog(token: string) {
    return apiRequest<RuleCatalogResponse>("/personalization/rule-catalog", {
      method: "GET",
      token,
    });
  },
};
