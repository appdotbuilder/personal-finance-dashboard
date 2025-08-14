import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, usersTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create test user first
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
  });

  it('should create a category with all fields', async () => {
    const testInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Food & Dining',
      color: '#FF5733',
      icon: '🍕'
    };

    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Food & Dining');
    expect(result.color).toEqual('#FF5733');
    expect(result.icon).toEqual('🍕');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category with null optional fields', async () => {
    const testInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Transportation',
      color: null,
      icon: null
    };

    const result = await createCategory(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Transportation');
    expect(result.color).toBeNull();
    expect(result.icon).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const testInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Entertainment',
      color: '#4CAF50',
      icon: '🎬'
    };

    const result = await createCategory(testInput);

    // Query database directly to verify persistence
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].user_id).toEqual(testUserId);
    expect(categories[0].name).toEqual('Entertainment');
    expect(categories[0].color).toEqual('#4CAF50');
    expect(categories[0].icon).toEqual('🎬');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateCategoryInput = {
      user_id: 99999, // Non-existent user
      name: 'Invalid Category',
      color: null,
      icon: null
    };

    await expect(createCategory(testInput))
      .rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should create multiple categories for the same user', async () => {
    const input1: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Groceries',
      color: '#2196F3',
      icon: '🛒'
    };

    const input2: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Utilities',
      color: '#FFC107',
      icon: '💡'
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    // Verify both categories exist
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);

    // Query all categories for this user
    const userCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, testUserId))
      .execute();

    expect(userCategories).toHaveLength(2);
    
    const categoryNames = userCategories.map(cat => cat.name).sort();
    expect(categoryNames).toEqual(['Groceries', 'Utilities']);
  });

  it('should handle categories with same name for different users', async () => {
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

    const sameCategoryName = 'Travel';

    const input1: CreateCategoryInput = {
      user_id: testUserId,
      name: sameCategoryName,
      color: '#E91E63',
      icon: '✈️'
    };

    const input2: CreateCategoryInput = {
      user_id: user2Id,
      name: sameCategoryName,
      color: '#9C27B0',
      icon: '🧳'
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(testUserId);
    expect(result2.user_id).toEqual(user2Id);
    expect(result1.name).toEqual(sameCategoryName);
    expect(result2.name).toEqual(sameCategoryName);
  });
});