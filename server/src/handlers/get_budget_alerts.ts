import { db } from '../db';
import { budgetsTable, transactionsTable, categoriesTable } from '../db/schema';
import { type BudgetAlert } from '../schema';
import { eq, and, sql, gte, lte, type SQL } from 'drizzle-orm';

export async function getBudgetAlerts(userId: number): Promise<BudgetAlert[]> {
  try {
    // Get all active budgets for the user with category information
    const budgetsQuery = db
      .select({
        budget_id: budgetsTable.id,
        budget_amount: budgetsTable.amount,
        period: budgetsTable.period,
        category_id: budgetsTable.category_id,
        category_name: categoriesTable.name
      })
      .from(budgetsTable)
      .leftJoin(categoriesTable, eq(budgetsTable.category_id, categoriesTable.id))
      .where(eq(budgetsTable.user_id, userId));

    const budgets = await budgetsQuery.execute();

    if (budgets.length === 0) {
      return [];
    }

    const alerts: BudgetAlert[] = [];

    // Process each budget to check spending against limits
    for (const budget of budgets) {
      const budgetAmount = parseFloat(budget.budget_amount);
      
      // Calculate the date range for the budget period
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

      let startDate: Date;
      let endDate: Date;

      if (budget.period === 'monthly') {
        // Monthly budget: current month
        startDate = new Date(currentYear, currentMonth - 1, 1); // First day of current month
        endDate = new Date(currentYear, currentMonth, 0); // Last day of current month
      } else {
        // Yearly budget: current year
        startDate = new Date(currentYear, 0, 1); // January 1st
        endDate = new Date(currentYear, 11, 31); // December 31st
      }

      // Build conditions for spending query
      const conditions: SQL<unknown>[] = [
        eq(transactionsTable.user_id, userId),
        eq(transactionsTable.type, 'expense'),
        gte(transactionsTable.date, startDate),
        lte(transactionsTable.date, endDate)
      ];

      // Add category filter if budget is category-specific
      if (budget.category_id !== null) {
        conditions.push(eq(transactionsTable.category_id, budget.category_id));
      }

      // Build and execute spending query
      const spendingQuery = db
        .select({
          total_spent: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)`
        })
        .from(transactionsTable)
        .where(and(...conditions));

      const spendingResult = await spendingQuery.execute();
      const spentAmount = parseFloat(spendingResult[0].total_spent);
      const percentageUsed = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      // Generate alert if spending is above threshold (80% or more)
      if (percentageUsed >= 80) {
        alerts.push({
          budget_id: budget.budget_id,
          category_name: budget.category_name,
          budget_amount: budgetAmount,
          spent_amount: spentAmount,
          percentage_used: Math.round(percentageUsed * 100) / 100, // Round to 2 decimal places
          period: budget.period
        });
      }
    }

    // Sort alerts by percentage used (highest first)
    alerts.sort((a, b) => b.percentage_used - a.percentage_used);

    return alerts;
  } catch (error) {
    console.error('Budget alerts retrieval failed:', error);
    throw error;
  }
}