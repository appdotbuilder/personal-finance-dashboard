import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Test Category',
        color: '#FF0000',
        icon: 'shopping'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  const baseTransactionInput: CreateTransactionInput = {
    user_id: 0, // Will be set to testUserId in tests
    category_id: 0, // Will be set to testCategoryId in tests
    type: 'expense',
    amount: 25.50,
    description: 'Test transaction',
    date: new Date('2024-01-15')
  };

  it('should create an expense transaction with category', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await createTransaction(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(25.50);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Test transaction');
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an income transaction without category', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: null,
      type: 'income' as const,
      amount: 1000.00,
      description: 'Salary payment'
    };

    const result = await createTransaction(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toBeNull();
    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(1000.00);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Salary payment');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database correctly', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await createTransaction(input);

    // Verify transaction was saved to database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const dbTransaction = transactions[0];
    expect(dbTransaction.user_id).toEqual(testUserId);
    expect(dbTransaction.category_id).toEqual(testCategoryId);
    expect(dbTransaction.type).toEqual('expense');
    expect(parseFloat(dbTransaction.amount)).toEqual(25.50); // Database stores as string
    expect(dbTransaction.description).toEqual('Test transaction');
    expect(dbTransaction.date).toEqual(new Date('2024-01-15'));
    expect(dbTransaction.created_at).toBeInstanceOf(Date);
    expect(dbTransaction.updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal amounts correctly', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: testCategoryId,
      amount: 99.99
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');

    // Verify precision in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(transactions[0].amount)).toEqual(99.99);
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: 999999, // Non-existent user
      category_id: testCategoryId
    };

    await expect(createTransaction(input))
      .rejects
      .toThrow(/User with id 999999 not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: 999999 // Non-existent category
    };

    await expect(createTransaction(input))
      .rejects
      .toThrow(/Category with id 999999 not found/i);
  });

  it('should create transaction when category_id is null', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: null
    };

    const result = await createTransaction(input);

    expect(result.category_id).toBeNull();
    expect(result.user_id).toEqual(testUserId);
    expect(result.amount).toEqual(25.50);
  });

  it('should handle large amounts correctly', async () => {
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: testCategoryId,
      amount: 999999.99
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(999999.99);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(transactions[0].amount)).toEqual(999999.99);
  });

  it('should preserve transaction date accurately', async () => {
    const testDate = new Date('2024-06-15T10:30:00Z');
    const input = {
      ...baseTransactionInput,
      user_id: testUserId,
      category_id: testCategoryId,
      date: testDate
    };

    const result = await createTransaction(input);

    expect(result.date).toEqual(testDate);

    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions[0].date).toEqual(testDate);
  });
});