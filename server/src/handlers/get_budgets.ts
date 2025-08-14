import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export async function getBudgets(userId: number): Promise<Budget[]> {
  try {
    const results = await db.select({
      id: budgetsTable.id,
      user_id: budgetsTable.user_id,
      category_id: budgetsTable.category_id,
      amount: budgetsTable.amount,
      period: budgetsTable.period,
      created_at: budgetsTable.created_at,
      updated_at: budgetsTable.updated_at
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.category_id, categoriesTable.id))
    .where(eq(budgetsTable.user_id, userId))
    .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      category_id: result.category_id,
      amount: parseFloat(result.amount), // Convert string back to number
      period: result.period,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    throw error;
  }
}