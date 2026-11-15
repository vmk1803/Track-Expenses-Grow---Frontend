export type IncomeCategory = {
  code:
    | "HOUSING"
    | "FOOD"
    | "TRANSPORT"
    | "UTILITIES"
    | "HEALTHCARE"
    | "EDUCATION"
    | "SAVINGS"
    | "INVESTMENTS"
    | "ENTERTAINMENT"
    | "Loans"
    | "OTHER"
    | "GROCERIES"
    | "EMI_LOAN"
    | "INSURANCE"
    | "EDUCATION_KIDS"
    | "CHILDCARE"
    | "DINING_OUT"
    | "SUBSCRIPTIONS"
    | "SHOPPING"
    | "TRAVEL"
    | "HOBBIES"
    | "PERSONAL_CARE"
    | "SELF_DEVELOPMENT"
    | "EMERGENCY_FUND"
    | "RETIREMENT"
    | "DEBT_PREPAYMENT"
    | "GOAL_SAVINGS";
  name: string;
};

export type IncomeCategoryCode = IncomeCategory["code"];

export type IncomeAllocation = {
  category: IncomeCategoryCode;
  limit: number;
};

export type IncomeAllocationView = IncomeAllocation & {
  categoryName: string;
};

export type IncomeView = {
  id: string;
  userId: string;
  totalIncome: number;
  allocations: IncomeAllocationView[];
  totalAllocated: number;
  remainingIncome: number;
  createdAt: string;
  updatedAt: string;
};

export type IncomePayload = {
  totalIncome: number;
  allocations: IncomeAllocation[];
};

export type IncomeCategoriesResponse = {
  categories: IncomeCategory[];
};

export type IncomeListResponse = {
  incomes: IncomeView[];
};

export type IncomeRecordResponse = {
  income: IncomeView;
};
