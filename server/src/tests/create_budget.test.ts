import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateBudgetInput } from '../schema';
import { createBudget } from '../handlers/create_budget';
import { eq, and, isNull } from 'drizzle-orm';

describe('createBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Food',
        color: '#ff0000',
        icon: 'food'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  const testInput: CreateBudgetInput = {
    user_id: 0, // Will be set in tests
    category_id: 0, // Will be set in tests
    amount: 500.50,
    period: 'monthly'
  };

  it('should create a budget with valid input', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await createBudget(input);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.amount).toEqual(500.50);
    expect(typeof result.amount).toBe('number');
    expect(result.period).toEqual('monthly');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a budget with null category_id', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: null
    };

    const result = await createBudget(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toBeNull();
    expect(result.amount).toEqual(500.50);
    expect(result.period).toEqual('monthly');
    expect(result.id).toBeDefined();
  });

  it('should save budget to database', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await createBudget(input);

    // Query database to verify budget was saved
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].user_id).toEqual(testUserId);
    expect(budgets[0].category_id).toEqual(testCategoryId);
    expect(parseFloat(budgets[0].amount)).toEqual(500.50);
    expect(budgets[0].period).toEqual('monthly');
    expect(budgets[0].created_at).toBeInstanceOf(Date);
    expect(budgets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create budget with yearly period', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId,
      period: 'yearly' as const
    };

    const result = await createBudget(input);

    expect(result.period).toEqual('yearly');
    
    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();
    
    expect(budgets[0].period).toEqual('yearly');
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...testInput,
      user_id: 99999, // Non-existent user
      category_id: testCategoryId
    };

    await expect(createBudget(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: 99999 // Non-existent category
    };

    await expect(createBudget(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    const input = {
      ...testInput,
      user_id: anotherUserId,
      category_id: testCategoryId // Category belongs to testUserId, not anotherUserId
    };

    await expect(createBudget(input)).rejects.toThrow(/category not found or does not belong to user/i);
  });

  it('should throw error when budget already exists for same user, category, and period', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    // Create first budget
    await createBudget(input);

    // Attempt to create duplicate budget
    await expect(createBudget(input)).rejects.toThrow(/budget already exists/i);
  });

  it('should throw error when null category budget already exists', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: null
    };

    // Create first budget with null category
    await createBudget(input);

    // Attempt to create duplicate budget with null category
    await expect(createBudget(input)).rejects.toThrow(/budget already exists/i);
  });

  it('should allow different periods for same user and category', async () => {
    const monthlyInput = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId,
      period: 'monthly' as const
    };

    const yearlyInput = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId,
      period: 'yearly' as const
    };

    // Create monthly budget
    const monthlyBudget = await createBudget(monthlyInput);
    expect(monthlyBudget.period).toEqual('monthly');

    // Create yearly budget for same user and category should succeed
    const yearlyBudget = await createBudget(yearlyInput);
    expect(yearlyBudget.period).toEqual('yearly');

    // Verify both exist in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(
        and(
          eq(budgetsTable.user_id, testUserId),
          eq(budgetsTable.category_id, testCategoryId)
        )
      )
      .execute();

    expect(budgets).toHaveLength(2);
    const periods = budgets.map(b => b.period).sort();
    expect(periods).toEqual(['monthly', 'yearly']);
  });

  it('should handle decimal amounts correctly', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId,
      amount: 999.99
    };

    const result = await createBudget(input);

    expect(result.amount).toEqual(999.99);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(parseFloat(budgets[0].amount)).toEqual(999.99);
  });
});