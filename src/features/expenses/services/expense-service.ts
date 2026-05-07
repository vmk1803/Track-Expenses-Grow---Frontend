import { apiRequest } from "@/lib/api/http-client";
import type {
  ExpenseCategoriesResponse,
  ExpenseListResponse,
  ExpensePayload,
  ExpenseRecordResponse,
} from "@/features/expenses/types/expense";

export const expenseService = {
  getExpenseCategories(token: string) {
    return apiRequest<ExpenseCategoriesResponse>("/expenses/categories", {
      method: "GET",
      token,
    });
  },
  listExpenses(token: string) {
    return apiRequest<ExpenseListResponse>("/expenses", {
      method: "GET",
      token,
    });
  },
  createExpense(payload: ExpensePayload, token: string) {
    return apiRequest<ExpenseRecordResponse>("/expenses", {
      method: "POST",
      body: payload,
      token,
    });
  },
  updateExpense(expenseId: string, payload: ExpensePayload, token: string) {
    return apiRequest<ExpenseRecordResponse>(`/expenses/${expenseId}`, {
      method: "PUT",
      body: payload,
      token,
    });
  },
  deleteExpense(expenseId: string, token: string) {
    return apiRequest<void>(`/expenses/${expenseId}`, {
      method: "DELETE",
      token,
    });
  },
};
