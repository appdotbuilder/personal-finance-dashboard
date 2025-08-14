import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type Transaction } from '../schema';
import { eq, and, gte, lte, ilike, desc, type SQL } from 'drizzle-orm';

export async function getTransactions(input: GetTransactionsInput): Promise<Transaction[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id
    conditions.push(eq(transactionsTable.user_id, input.user_id));

    // Date range filtering
    if (input.start_date) {
      conditions.push(gte(transactionsTable.date, input.start_date));
    }
    if (input.end_date) {
      conditions.push(lte(transactionsTable.date, input.end_date));
    }

    // Category filtering
    if (input.category_id) {
      conditions.push(eq(transactionsTable.category_id, input.category_id));
    }

    // Transaction type filtering
    if (input.type) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    // Amount range filtering
    if (input.min_amount !== undefined) {
      conditions.push(gte(transactionsTable.amount, input.min_amount.toString()));
    }
    if (input.max_amount !== undefined) {
      conditions.push(lte(transactionsTable.amount, input.max_amount.toString()));
    }

    // Search functionality on description (case insensitive)
    if (input.search) {
      conditions.push(ilike(transactionsTable.description, `%${input.search}%`));
    }

    // Build query with all conditions, ordering, and pagination
    const query = db.select()
      .from(transactionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
      .limit(input.limit)
      .offset(input.offset);

    const results = await query.execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
}