import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type GetSummaryInput, type Summary } from '../schema';
import { eq, and, gte, lte, sum, count, sql, isNull } from 'drizzle-orm';

export const getSummary = async (input: GetSummaryInput): Promise<Summary> => {
  try {
    // Calculate date ranges based on period
    const { startDate, endDate } = getDateRange(input);

    // Build base conditions
    const conditions = [
      eq(transactionsTable.user_id, input.user_id),
      gte(transactionsTable.date, startDate),
      lte(transactionsTable.date, endDate)
    ];

    // Get total income and expenses
    const totalIncomeResult = await db
      .select({
        total: sum(transactionsTable.amount)
      })
      .from(transactionsTable)
      .where(
        and(
          ...conditions,
          eq(transactionsTable.type, 'income')
        )
      )
      .execute();

    const totalExpensesResult = await db
      .select({
        total: sum(transactionsTable.amount)
      })
      .from(transactionsTable)
      .where(
        and(
          ...conditions,
          eq(transactionsTable.type, 'expense')
        )
      )
      .execute();

    const totalIncome = parseFloat(totalIncomeResult[0]?.total || '0');
    const totalExpenses = parseFloat(totalExpensesResult[0]?.total || '0');

    // Get category breakdown
    const categoryResults = await db
      .select({
        category_id: transactionsTable.category_id,
        category_name: categoriesTable.name,
        total_amount: sum(transactionsTable.amount),
        transaction_count: count(transactionsTable.id)
      })
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
      .where(and(...conditions))
      .groupBy(transactionsTable.category_id, categoriesTable.name)
      .execute();

    const categories = categoryResults.map(result => ({
      category_id: result.category_id,
      category_name: result.category_name,
      total_amount: parseFloat(result.total_amount || '0'),
      transaction_count: result.transaction_count
    }));

    // Generate monthly data for yearly summaries
    let monthlyData: Array<{ month: number; income: number; expenses: number }> | undefined;

    if (input.period === 'yearly') {
      const monthlyResults = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${transactionsTable.date})`,
          type: transactionsTable.type,
          total: sum(transactionsTable.amount)
        })
        .from(transactionsTable)
        .where(and(...conditions))
        .groupBy(sql`EXTRACT(MONTH FROM ${transactionsTable.date})`, transactionsTable.type)
        .execute();

      // Initialize monthly data array with all 12 months
      monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        income: 0,
        expenses: 0
      }));

      // Fill in actual data
      monthlyResults.forEach(result => {
        const monthIndex = result.month - 1;
        const amount = parseFloat(result.total || '0');
        
        if (result.type === 'income') {
          monthlyData![monthIndex].income = amount;
        } else if (result.type === 'expense') {
          monthlyData![monthIndex].expenses = amount;
        }
      });
    }

    return {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_income: totalIncome - totalExpenses,
      categories,
      monthly_data: monthlyData
    };
  } catch (error) {
    console.error('Summary generation failed:', error);
    throw error;
  }
};

function getDateRange(input: GetSummaryInput): { startDate: Date; endDate: Date } {
  if (input.period === 'monthly') {
    if (!input.month) {
      throw new Error('Month is required for monthly summaries');
    }
    
    const startDate = new Date(input.year, input.month - 1, 1);
    const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);
    
    return { startDate, endDate };
  } else {
    // Yearly period
    const startDate = new Date(input.year, 0, 1);
    const endDate = new Date(input.year, 11, 31, 23, 59, 59, 999);
    
    return { startDate, endDate };
  }
}