import { db } from '../db';
import { transactionsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Validate user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Validate category exists if provided
    if (input.category_id !== null) {
      const categoryExists = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        category_id: input.category_id,
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        date: input.date
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};