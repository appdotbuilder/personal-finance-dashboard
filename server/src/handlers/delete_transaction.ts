import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTransaction(transactionId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // Delete transaction that belongs to the user
    const result = await db.delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.user_id, userId)
        )
      )
      .execute();

    // Check if a row was actually deleted
    const success = (result.rowCount ?? 0) > 0;
    
    return { success };
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}