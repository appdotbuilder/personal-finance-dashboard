import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User input schemas
export const signupInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1)
});

export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const passwordResetInputSchema = z.object({
  email: z.string().email()
});

export type PasswordResetInput = z.infer<typeof passwordResetInputSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  color: z.string().nullable(),
  icon: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Transaction type enum
export const transactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category_id: z.number().nullable(),
  type: transactionTypeSchema,
  amount: z.number(),
  description: z.string(),
  date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  category_id: z.number().nullable(),
  type: transactionTypeSchema,
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.coerce.date()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  category_id: z.number().nullable().optional(),
  type: transactionTypeSchema.optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Budget schema
export const budgetSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category_id: z.number().nullable(),
  amount: z.number(),
  period: z.enum(['monthly', 'yearly']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Budget = z.infer<typeof budgetSchema>;

export const createBudgetInputSchema = z.object({
  user_id: z.number(),
  category_id: z.number().nullable(),
  amount: z.number().positive(),
  period: z.enum(['monthly', 'yearly'])
});

export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

export const updateBudgetInputSchema = z.object({
  id: z.number(),
  category_id: z.number().nullable().optional(),
  amount: z.number().positive().optional(),
  period: z.enum(['monthly', 'yearly']).optional()
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetInputSchema>;

// Query schemas
export const getTransactionsInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  category_id: z.number().optional(),
  type: transactionTypeSchema.optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const getSummaryInputSchema = z.object({
  user_id: z.number(),
  period: z.enum(['monthly', 'yearly']),
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional()
});

export type GetSummaryInput = z.infer<typeof getSummaryInputSchema>;

// Summary response schema
export const summarySchema = z.object({
  total_income: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  categories: z.array(z.object({
    category_id: z.number().nullable(),
    category_name: z.string().nullable(),
    total_amount: z.number(),
    transaction_count: z.number()
  })),
  monthly_data: z.array(z.object({
    month: z.number(),
    income: z.number(),
    expenses: z.number()
  })).optional()
});

export type Summary = z.infer<typeof summarySchema>;

// Budget alert schema
export const budgetAlertSchema = z.object({
  budget_id: z.number(),
  category_name: z.string().nullable(),
  budget_amount: z.number(),
  spent_amount: z.number(),
  percentage_used: z.number(),
  period: z.enum(['monthly', 'yearly'])
});

export type BudgetAlert = z.infer<typeof budgetAlertSchema>;