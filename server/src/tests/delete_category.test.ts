import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq, and, isNull } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a category successfully', async () => {
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

    // Delete the category
    const result = await deleteCategory(categoryId, userId);

    expect(result.success).toBe(true);

    // Verify category is deleted
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);
  });

  it('should set transactions category_id to null when deleting category', async () => {
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

    // Create test transactions with this category
    const transactionResult = await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense' as const,
          amount: '100.50',
          description: 'Test transaction 1',
          date: new Date()
        },
        {
          user_id: userId,
          category_id: categoryId,
          type: 'income' as const,
          amount: '200.75',
          description: 'Test transaction 2',
          date: new Date()
        }
      ])
      .returning()
      .execute();

    // Delete the category
    const result = await deleteCategory(categoryId, userId);

    expect(result.success).toBe(true);

    // Verify transactions now have category_id set to null
    const updatedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(updatedTransactions).toHaveLength(2);
    updatedTransactions.forEach(transaction => {
      expect(transaction.category_id).toBeNull();
    });
  });

  it('should throw error when category does not exist', async () => {
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
    const userId = userResult[0].id;

    const nonExistentCategoryId = 99999;

    // Attempt to delete non-existent category
    await expect(deleteCategory(nonExistentCategoryId, userId))
      .rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create first test user and category
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second test user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create category for user1
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: user1Id,
        name: 'User1 Category',
        color: '#FF0000',
        icon: 'test-icon'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Attempt to delete user1's category as user2
    await expect(deleteCategory(categoryId, user2Id))
      .rejects.toThrow(/category not found.*does not belong to user/i);

    // Verify category still exists
    const remainingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(remainingCategory).toHaveLength(1);
    expect(remainingCategory[0].user_id).toBe(user1Id);
  });

  it('should handle deletion with no associated transactions', async () => {
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
    const userId = userResult[0].id;

    // Create category with no transactions
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Empty Category',
        color: '#00FF00',
        icon: 'empty-icon'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Delete category
    const result = await deleteCategory(categoryId, userId);

    expect(result.success).toBe(true);

    // Verify category is deleted
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);
  });

  it('should only update transactions for the deleted category', async () => {
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
    const userId = userResult[0].id;

    // Create two categories
    const category1Result = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Category 1',
        color: '#FF0000',
        icon: 'icon1'
      })
      .returning()
      .execute();
    const category1Id = category1Result[0].id;

    const category2Result = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Category 2',
        color: '#00FF00',
        icon: 'icon2'
      })
      .returning()
      .execute();
    const category2Id = category2Result[0].id;

    // Create transactions for both categories
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: category1Id,
          type: 'expense' as const,
          amount: '100.00',
          description: 'Category 1 transaction',
          date: new Date()
        },
        {
          user_id: userId,
          category_id: category2Id,
          type: 'expense' as const,
          amount: '200.00',
          description: 'Category 2 transaction',
          date: new Date()
        }
      ])
      .execute();

    // Delete category 1
    const result = await deleteCategory(category1Id, userId);

    expect(result.success).toBe(true);

    // Verify only category 1 transactions were updated
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    const category1Transaction = transactions.find(t => t.description === 'Category 1 transaction');
    const category2Transaction = transactions.find(t => t.description === 'Category 2 transaction');

    expect(category1Transaction?.category_id).toBeNull();
    expect(category2Transaction?.category_id).toBe(category2Id);
  });
});