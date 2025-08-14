import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // First verify transaction exists
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // Build update object only with fields that are provided
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.date !== undefined) {
      updateData.date = input.date;
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};