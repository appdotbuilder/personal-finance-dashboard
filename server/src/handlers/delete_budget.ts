import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteBudget(budgetId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // Verify budget exists and belongs to user, then delete it
    const result = await db.delete(budgetsTable)
      .where(and(
        eq(budgetsTable.id, budgetId),
        eq(budgetsTable.user_id, userId)
      ))
      .returning({ id: budgetsTable.id })
      .execute();

    // Return success based on whether a record was deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Budget deletion failed:', error);
    throw error;
  }
}