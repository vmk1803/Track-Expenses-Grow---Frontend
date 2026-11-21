import { apiRequest } from "@/lib/api/http-client";
import type {
  ParseExpenseRequest,
  ParseExpenseResponse,
} from "@/features/expenses/smart-add/types";

export const smartAddService = {
  /** AI parse of one sentence. Always 200; fields are empty when the AI is unavailable. */
  parseExpense(body: ParseExpenseRequest, token: string, signal?: AbortSignal) {
    return apiRequest<ParseExpenseResponse>("/expenses/parse", {
      method: "POST",
      body,
      token,
      signal,
    });
  },
};
