import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  signupInputSchema,
  loginInputSchema,
  passwordResetInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  getTransactionsInputSchema,
  getSummaryInputSchema,
  createBudgetInputSchema,
  updateBudgetInputSchema
} from './schema';

// Import handlers
import { signup } from './handlers/signup';
import { login } from './handlers/login';
import { resetPassword } from './handlers/reset_password';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { getSummary } from './handlers/get_summary';
import { createBudget } from './handlers/create_budget';
import { getBudgets } from './handlers/get_budgets';
import { updateBudget } from './handlers/update_budget';
import { deleteBudget } from './handlers/delete_budget';
import { getBudgetAlerts } from './handlers/get_budget_alerts';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  signup: publicProcedure
    .input(signupInputSchema)
    .mutation(({ input }) => signup(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  resetPassword: publicProcedure
    .input(passwordResetInputSchema)
    .mutation(({ input }) => resetPassword(input)),

  // Category management routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCategories(input.userId)),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  deleteCategory: publicProcedure
    .input(z.object({ categoryId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteCategory(input.categoryId, input.userId)),

  // Transaction management routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .input(getTransactionsInputSchema)
    .query(({ input }) => getTransactions(input)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  deleteTransaction: publicProcedure
    .input(z.object({ transactionId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteTransaction(input.transactionId, input.userId)),

  // Summary and analytics routes
  getSummary: publicProcedure
    .input(getSummaryInputSchema)
    .query(({ input }) => getSummary(input)),

  // Budget management routes
  createBudget: publicProcedure
    .input(createBudgetInputSchema)
    .mutation(({ input }) => createBudget(input)),

  getBudgets: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getBudgets(input.userId)),

  updateBudget: publicProcedure
    .input(updateBudgetInputSchema)
    .mutation(({ input }) => updateBudget(input)),

  deleteBudget: publicProcedure
    .input(z.object({ budgetId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteBudget(input.budgetId, input.userId)),

  // Budget alerts route
  getBudgetAlerts: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getBudgetAlerts(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance Dashboard TRPC server listening at port: ${port}`);
}

start();