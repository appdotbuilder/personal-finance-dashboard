import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, budgetsTable } from '../db/schema';
import { deleteBudget } from '../handlers/delete_budget';
import { eq } from 'drizzle-orm';

describe('deleteBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a budget that exists and belongs to user', async () => {
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
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        color: '#FF0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test budget
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '500.00',
        period: 'monthly'
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Delete the budget
    const result = await deleteBudget(budgetId, userId);

    // Should return success
    expect(result.success).toBe(true);

    // Budget should no longer exist in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();

    expect(budgets).toHaveLength(0);
  });

  it('should delete budget without category (overall budget)', async () => {
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
    const userId = userResult[0].id;

    // Create test budget without category
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: null,
        amount: '1000.00',
        period: 'yearly'
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Delete the budget
    const result = await deleteBudget(budgetId, userId);

    // Should return success
    expect(result.success).toBe(true);

    // Budget should no longer exist in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();

    expect(budgets).toHaveLength(0);
  });

  it('should return false when budget does not exist', async () => {
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
    const userId = userResult[0].id;

    // Try to delete non-existent budget
    const result = await deleteBudget(999, userId);

    // Should return false for success
    expect(result.success).toBe(false);
  });

  it('should return false when budget belongs to different user', async () => {
    // Create first test user
    const userResult1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();
    const userId1 = userResult1[0].id;

    // Create second test user
    const userResult2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();
    const userId2 = userResult2[0].id;

    // Create category for first user
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId1,
        name: 'Test Category',
        color: '#FF0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create budget for first user
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId1,
        category_id: categoryId,
        amount: '300.00',
        period: 'monthly'
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Try to delete budget as second user
    const result = await deleteBudget(budgetId, userId2);

    // Should return false for success
    expect(result.success).toBe(false);

    // Budget should still exist in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].user_id).toBe(userId1);
  });

  it('should not affect other budgets when deleting', async () => {
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
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        color: '#FF0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create two test budgets
    const budget1Result = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '500.00',
        period: 'monthly'
      })
      .returning()
      .execute();
    const budget1Id = budget1Result[0].id;

    const budget2Result = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: null,
        amount: '1000.00',
        period: 'yearly'
      })
      .returning()
      .execute();
    const budget2Id = budget2Result[0].id;

    // Delete first budget
    const result = await deleteBudget(budget1Id, userId);

    // Should return success
    expect(result.success).toBe(true);

    // First budget should be deleted
    const budget1Check = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget1Id))
      .execute();
    expect(budget1Check).toHaveLength(0);

    // Second budget should still exist
    const budget2Check = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget2Id))
      .execute();
    expect(budget2Check).toHaveLength(1);
    expect(parseFloat(budget2Check[0].amount)).toBe(1000.00);
  });
});