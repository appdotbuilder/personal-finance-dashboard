import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type UpdateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

describe('updateCategory', () => {
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
        name: 'Original Category',
        color: '#ff0000',
        icon: 'shopping-cart'
      })
      .returning()
      .execute();
    
    testCategoryId = categoryResult[0].id;
  });

  it('should update category name only', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.color).toEqual('#ff0000'); // Should remain unchanged
    expect(result.icon).toEqual('shopping-cart'); // Should remain unchanged
    expect(result.user_id).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update category color only', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      color: '#00ff00'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#00ff00');
    expect(result.icon).toEqual('shopping-cart'); // Should remain unchanged
    expect(result.user_id).toEqual(testUserId);
  });

  it('should update category icon only', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      icon: 'food'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#ff0000'); // Should remain unchanged
    expect(result.icon).toEqual('food');
    expect(result.user_id).toEqual(testUserId);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Food & Dining',
      color: '#0000ff',
      icon: 'restaurant'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Food & Dining');
    expect(result.color).toEqual('#0000ff');
    expect(result.icon).toEqual('restaurant');
    expect(result.user_id).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should set nullable fields to null', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      color: null,
      icon: null
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toBeNull();
    expect(result.icon).toBeNull();
    expect(result.user_id).toEqual(testUserId);
  });

  it('should persist changes to database', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Entertainment',
      color: '#ff00ff'
    };

    await updateCategory(input);

    // Verify changes were saved to database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, testCategoryId))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Entertainment');
    expect(categories[0].color).toEqual('#ff00ff');
    expect(categories[0].icon).toEqual('shopping-cart'); // Should remain unchanged
    expect(categories[0].user_id).toEqual(testUserId);
  });

  it('should throw error for non-existent category', async () => {
    const input: UpdateCategoryInput = {
      id: 99999, // Non-existent ID
      name: 'Should Fail'
    };

    await expect(updateCategory(input)).rejects.toThrow(/not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId
      // No fields to update
    };

    const result = await updateCategory(input);

    // Should return the category unchanged
    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Original Category');
    expect(result.color).toEqual('#ff0000');
    expect(result.icon).toEqual('shopping-cart');
    expect(result.user_id).toEqual(testUserId);
  });

  it('should update category with null initial values', async () => {
    // Create category with null color and icon
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Null Category',
        color: null,
        icon: null
      })
      .returning()
      .execute();
    
    const nullCategoryId = categoryResult[0].id;

    const input: UpdateCategoryInput = {
      id: nullCategoryId,
      color: '#123456',
      icon: 'star'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(nullCategoryId);
    expect(result.name).toEqual('Null Category');
    expect(result.color).toEqual('#123456');
    expect(result.icon).toEqual('star');
    expect(result.user_id).toEqual(testUserId);
  });
});