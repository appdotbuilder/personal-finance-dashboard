import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no categories', async () => {
    // Create a user but no categories
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

    const result = await getCategories(userId);

    expect(result).toEqual([]);
  });

  it('should return user categories when they exist', async () => {
    // Create a user
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

    // Create categories for the user
    const categoryResults = await db.insert(categoriesTable)
      .values([
        {
          user_id: userId,
          name: 'Food',
          color: '#FF5733',
          icon: '🍔'
        },
        {
          user_id: userId,
          name: 'Transport',
          color: '#33FF57',
          icon: '🚗'
        }
      ])
      .returning()
      .execute();

    const result = await getCategories(userId);

    expect(result).toHaveLength(2);
    
    // Sort results by name for consistent testing
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));
    
    expect(sortedResult[0].name).toEqual('Food');
    expect(sortedResult[0].color).toEqual('#FF5733');
    expect(sortedResult[0].icon).toEqual('🍔');
    expect(sortedResult[0].user_id).toEqual(userId);
    expect(sortedResult[0].id).toBeDefined();
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);

    expect(sortedResult[1].name).toEqual('Transport');
    expect(sortedResult[1].color).toEqual('#33FF57');
    expect(sortedResult[1].icon).toEqual('🚗');
    expect(sortedResult[1].user_id).toEqual(userId);
    expect(sortedResult[1].id).toBeDefined();
    expect(sortedResult[1].created_at).toBeInstanceOf(Date);
  });

  it('should only return categories for the specified user', async () => {
    // Create two users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashedpassword1',
          first_name: 'User',
          last_name: 'One'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashedpassword2',
          first_name: 'User',
          last_name: 'Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create categories for both users
    await db.insert(categoriesTable)
      .values([
        {
          user_id: user1Id,
          name: 'User1 Category',
          color: '#FF5733',
          icon: '🔴'
        },
        {
          user_id: user2Id,
          name: 'User2 Category',
          color: '#33FF57',
          icon: '🟢'
        },
        {
          user_id: user1Id,
          name: 'Another User1 Category',
          color: '#3357FF',
          icon: '🔵'
        }
      ])
      .execute();

    // Get categories for user1
    const user1Categories = await getCategories(user1Id);
    expect(user1Categories).toHaveLength(2);
    expect(user1Categories.every(cat => cat.user_id === user1Id)).toBe(true);

    // Get categories for user2
    const user2Categories = await getCategories(user2Id);
    expect(user2Categories).toHaveLength(1);
    expect(user2Categories.every(cat => cat.user_id === user2Id)).toBe(true);
    expect(user2Categories[0].name).toEqual('User2 Category');
  });

  it('should handle categories with nullable color and icon fields', async () => {
    // Create a user
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

    // Create categories with null values
    await db.insert(categoriesTable)
      .values([
        {
          user_id: userId,
          name: 'Category with nulls',
          color: null,
          icon: null
        },
        {
          user_id: userId,
          name: 'Category with partial nulls',
          color: '#FF5733',
          icon: null
        }
      ])
      .execute();

    const result = await getCategories(userId);

    expect(result).toHaveLength(2);
    
    const categoryWithNulls = result.find(cat => cat.name === 'Category with nulls');
    expect(categoryWithNulls).toBeDefined();
    expect(categoryWithNulls!.color).toBeNull();
    expect(categoryWithNulls!.icon).toBeNull();

    const categoryWithPartialNulls = result.find(cat => cat.name === 'Category with partial nulls');
    expect(categoryWithPartialNulls).toBeDefined();
    expect(categoryWithPartialNulls!.color).toEqual('#FF5733');
    expect(categoryWithPartialNulls!.icon).toBeNull();
  });
});