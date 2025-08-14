import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a transaction that belongs to the user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        color: '#ff0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        type: 'expense',
        amount: '100.00',
        description: 'Test transaction',
        date: new Date('2024-01-15')
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Delete the transaction
    const result = await deleteTransaction(transactionId, userId);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify transaction was deleted from database
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(deletedTransaction).toHaveLength(0);
  });

  it('should return false when transaction does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const nonExistentTransactionId = 99999;

    // Try to delete non-existent transaction
    const result = await deleteTransaction(nonExistentTransactionId, userId);

    // Verify failure response
    expect(result.success).toBe(false);
  });

  it('should return false when transaction belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const user2Id = user2Result[0].id;

    // Create category for user1
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: user1Id,
        name: 'User1 Category',
        color: '#ff0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create transaction for user1
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        category_id: categoryId,
        type: 'income',
        amount: '200.00',
        description: 'User1 transaction',
        date: new Date('2024-01-20')
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Try to delete user1's transaction as user2
    const result = await deleteTransaction(transactionId, user2Id);

    // Verify failure response
    expect(result.success).toBe(false);

    // Verify transaction still exists in database
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(existingTransaction).toHaveLength(1);
    expect(existingTransaction[0].user_id).toBe(user1Id);
  });

  it('should delete transaction with null category_id', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create transaction without category
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: null,
        type: 'expense',
        amount: '50.00',
        description: 'Uncategorized transaction',
        date: new Date('2024-01-10')
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Delete the transaction
    const result = await deleteTransaction(transactionId, userId);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify transaction was deleted from database
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(deletedTransaction).toHaveLength(0);
  });

  it('should handle database constraint scenarios correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        color: '#00ff00',
        icon: 'dollar'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple transactions
    const transaction1Result = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        type: 'income',
        amount: '300.00',
        description: 'First transaction',
        date: new Date('2024-01-01')
      })
      .returning()
      .execute();

    const transaction2Result = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        type: 'expense',
        amount: '150.00',
        description: 'Second transaction',
        date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    const transaction1Id = transaction1Result[0].id;
    const transaction2Id = transaction2Result[0].id;

    // Delete first transaction
    const result1 = await deleteTransaction(transaction1Id, userId);
    expect(result1.success).toBe(true);

    // Verify first transaction deleted, second still exists
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(remainingTransactions).toHaveLength(1);
    expect(remainingTransactions[0].id).toBe(transaction2Id);
    expect(remainingTransactions[0].description).toBe('Second transaction');
  });
});