import { apiRequest } from "@/lib/api/http-client";
import type { OverviewResponse } from "@/features/overview/types/overview";

export const overviewService = {
  getOverview(token: string) {
    return apiRequest<OverviewResponse>("/overview", {
      method: "GET",
      token,
    });
  },
};
