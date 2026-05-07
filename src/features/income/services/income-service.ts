import { apiRequest } from "@/lib/api/http-client";
import type {
  IncomeCategoriesResponse,
  IncomeListResponse,
  IncomePayload,
  IncomeRecordResponse,
} from "@/features/income/types/income";

export const incomeService = {
  getIncomeCategories(token: string) {
    return apiRequest<IncomeCategoriesResponse>("/income/categories", {
      method: "GET",
      token,
    });
  },
  listIncome(token: string) {
    return apiRequest<IncomeListResponse>("/income", {
      method: "GET",
      token,
    });
  },
  createIncome(payload: IncomePayload, token: string) {
    return apiRequest<IncomeRecordResponse>("/income", {
      method: "POST",
      body: payload,
      token,
    });
  },
  updateIncome(incomeId: string, payload: IncomePayload, token: string) {
    return apiRequest<IncomeRecordResponse>(`/income/${incomeId}`, {
      method: "PUT",
      body: payload,
      token,
    });
  },
  deleteIncome(incomeId: string, token: string) {
    return apiRequest<void>(`/income/${incomeId}`, {
      method: "DELETE",
      token,
    });
  },
};
