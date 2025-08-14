import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;
  let testTransactionId: number;

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
        icon: 'test-icon'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        type: 'expense',
        amount: '50.00',
        description: 'Original description',
        date: new Date('2024-01-15')
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;
  });

  it('should update a transaction with all fields', async () => {
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: testCategoryId,
      type: 'income',
      amount: 150.75,
      description: 'Updated description',
      date: new Date('2024-01-20')
    };

    const result = await updateTransaction(updateInput);

    // Verify the returned transaction
    expect(result.id).toEqual(testTransactionId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toEqual('number');
    expect(result.description).toEqual('Updated description');
    expect(result.date).toEqual(new Date('2024-01-20'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 75.50,
      description: 'Partially updated'
    };

    const result = await updateTransaction(updateInput);

    // Verify updated fields
    expect(result.amount).toEqual(75.50);
    expect(result.description).toEqual('Partially updated');

    // Verify unchanged fields
    expect(result.type).toEqual('expense'); // Original value
    expect(result.category_id).toEqual(testCategoryId); // Original value
    expect(result.date).toEqual(new Date('2024-01-15')); // Original value
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update category_id to null', async () => {
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: null
    };

    const result = await updateTransaction(updateInput);

    expect(result.category_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated transaction to database', async () => {
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      type: 'income',
      amount: 200.00,
      description: 'Database test'
    };

    await updateTransaction(updateInput);

    // Query database to verify changes
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    const transaction = transactions[0];
    expect(transaction.type).toEqual('income');
    expect(parseFloat(transaction.amount)).toEqual(200.00);
    expect(transaction.description).toEqual('Database test');
    expect(transaction.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent transaction', async () => {
    const updateInput: UpdateTransactionInput = {
      id: 99999,
      amount: 100.00
    };

    expect(updateTransaction(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update date field correctly', async () => {
    const newDate = new Date('2024-02-01T10:30:00Z');
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      date: newDate
    };

    const result = await updateTransaction(updateInput);

    expect(result.date).toEqual(newDate);

    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();

    expect(transactions[0].date).toEqual(newDate);
  });

  it('should handle numeric precision correctly', async () => {
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 123.456789 // Test precision handling
    };

    const result = await updateTransaction(updateInput);

    // PostgreSQL numeric(12,2) rounds to 2 decimal places
    expect(result.amount).toEqual(123.46);
    expect(typeof result.amount).toEqual('number');
  });

  it('should update transaction type correctly', async () => {
    const updateInput: UpdateTransactionInput = {
      id: testTransactionId,
      type: 'income'
    };

    const result = await updateTransaction(updateInput);

    expect(result.type).toEqual('income');

    // Verify other fields remain unchanged
    expect(result.amount).toEqual(50); // Original amount
    expect(result.description).toEqual('Original description');
  });
});