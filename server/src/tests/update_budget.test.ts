import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, categoriesTable } from '../db/schema';
import { type UpdateBudgetInput } from '../schema';
import { updateBudget } from '../handlers/update_budget';
import { eq } from 'drizzle-orm';

describe('updateBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helpers
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestCategory = async (userId: number) => {
    const result = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        color: '#ff0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestBudget = async (userId: number, categoryId?: number) => {
    const result = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId || null,
        amount: '1000.00',
        period: 'monthly'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update a budget with all fields', async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id);
    const budget = await createTestBudget(user.id, category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: null,
      amount: 1500.50,
      period: 'yearly'
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(budget.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.category_id).toBeNull();
    expect(result.amount).toEqual(1500.50);
    expect(typeof result.amount).toEqual('number');
    expect(result.period).toEqual('yearly');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update only specified fields', async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id);
    const budget = await createTestBudget(user.id, category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      amount: 750.25
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(budget.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.category_id).toEqual(category.id); // Should remain unchanged
    expect(result.amount).toEqual(750.25);
    expect(result.period).toEqual('monthly'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated budget to database', async () => {
    const user = await createTestUser();
    const budget = await createTestBudget(user.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      amount: 2000.00,
      period: 'yearly'
    };

    await updateBudget(updateInput);

    // Verify changes were saved to database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget.id))
      .execute();

    expect(budgets).toHaveLength(1);
    const savedBudget = budgets[0];
    expect(parseFloat(savedBudget.amount)).toEqual(2000.00);
    expect(savedBudget.period).toEqual('yearly');
    expect(savedBudget.updated_at).toBeInstanceOf(Date);
    expect(savedBudget.updated_at > savedBudget.created_at).toBe(true);
  });

  it('should update budget with valid category', async () => {
    const user = await createTestUser();
    const category1 = await createTestCategory(user.id);
    const category2 = await createTestCategory(user.id);
    const budget = await createTestBudget(user.id, category1.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: category2.id
    };

    const result = await updateBudget(updateInput);

    expect(result.category_id).toEqual(category2.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when budget does not exist', async () => {
    const updateInput: UpdateBudgetInput = {
      id: 999999, // Non-existent budget ID
      amount: 500.00
    };

    await expect(updateBudget(updateInput)).rejects.toThrow(/budget not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const user = await createTestUser();
    const budget = await createTestBudget(user.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: 999999 // Non-existent category ID
    };

    await expect(updateBudget(updateInput)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute()
      .then(result => result[0]);

    const category2 = await createTestCategory(user2.id);
    const budget1 = await createTestBudget(user1.id);

    const updateInput: UpdateBudgetInput = {
      id: budget1.id,
      category_id: category2.id // Category belongs to different user
    };

    await expect(updateBudget(updateInput)).rejects.toThrow(/category not found or does not belong to user/i);
  });

  it('should handle updating to null category', async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id);
    const budget = await createTestBudget(user.id, category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: null
    };

    const result = await updateBudget(updateInput);

    expect(result.category_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget.id))
      .execute();

    expect(budgets[0].category_id).toBeNull();
  });

  it('should handle numeric precision correctly', async () => {
    const user = await createTestUser();
    const budget = await createTestBudget(user.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      amount: 1234.56
    };

    const result = await updateBudget(updateInput);

    expect(result.amount).toEqual(1234.56);
    expect(typeof result.amount).toEqual('number');

    // Verify precision is preserved in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget.id))
      .execute();

    expect(parseFloat(budgets[0].amount)).toEqual(1234.56);
  });
});