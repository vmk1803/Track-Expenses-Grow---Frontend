import { apiRequest } from "@/lib/api/http-client";
import type {
  RecurringExpensePayload,
  RecurringListResponse,
  RecurringRecordResponse,
} from "@/features/recurring/types/recurring";

export const recurringService = {
  listRecurring(token: string) {
    return apiRequest<RecurringListResponse>("/recurring", {
      method: "GET",
      token,
    });
  },
  createRecurring(payload: RecurringExpensePayload, token: string) {
    return apiRequest<RecurringRecordResponse>("/recurring", {
      method: "POST",
      body: payload,
      token,
    });
  },
  deleteRecurring(recurringId: string, token: string) {
    return apiRequest<void>(`/recurring/${recurringId}`, {
      method: "DELETE",
      token,
    });
  },
};
