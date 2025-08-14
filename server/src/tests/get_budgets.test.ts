import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, budgetsTable } from '../db/schema';
import { getBudgets } from '../handlers/get_budgets';
import { eq } from 'drizzle-orm';

describe('getBudgets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no budgets', async () => {
    // Create a user with no budgets
    const [user] = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const result = await getBudgets(user.id);

    expect(result).toEqual([]);
  });

  it('should return budgets for a specific user', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable).values({
      email: 'user1@example.com',
      password_hash: 'hashedpassword',
      first_name: 'User',
      last_name: 'One'
    }).returning().execute();

    const [user2] = await db.insert(usersTable).values({
      email: 'user2@example.com',
      password_hash: 'hashedpassword',
      first_name: 'User',
      last_name: 'Two'
    }).returning().execute();

    // Create categories for user1
    const [category1] = await db.insert(categoriesTable).values({
      user_id: user1.id,
      name: 'Food',
      color: '#FF0000',
      icon: 'food'
    }).returning().execute();

    // Create budgets - one for user1, one for user2
    const [budget1] = await db.insert(budgetsTable).values({
      user_id: user1.id,
      category_id: category1.id,
      amount: '500.00',
      period: 'monthly'
    }).returning().execute();

    await db.insert(budgetsTable).values({
      user_id: user2.id,
      category_id: null,
      amount: '1000.00',
      period: 'monthly'
    }).execute();

    const result = await getBudgets(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(budget1.id);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].category_id).toEqual(category1.id);
    expect(result[0].amount).toEqual(500.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].period).toEqual('monthly');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle budgets with null category_id', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    // Create budget without category (overall budget)
    const [budget] = await db.insert(budgetsTable).values({
      user_id: user.id,
      category_id: null,
      amount: '2000.00',
      period: 'yearly'
    }).returning().execute();

    const result = await getBudgets(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(budget.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].category_id).toBeNull();
    expect(result[0].amount).toEqual(2000.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].period).toEqual('yearly');
  });

  it('should return multiple budgets for a user', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    // Create categories
    const [category1] = await db.insert(categoriesTable).values({
      user_id: user.id,
      name: 'Food',
      color: '#FF0000',
      icon: 'food'
    }).returning().execute();

    const [category2] = await db.insert(categoriesTable).values({
      user_id: user.id,
      name: 'Transport',
      color: '#00FF00',
      icon: 'transport'
    }).returning().execute();

    // Create multiple budgets
    await db.insert(budgetsTable).values([
      {
        user_id: user.id,
        category_id: category1.id,
        amount: '300.00',
        period: 'monthly'
      },
      {
        user_id: user.id,
        category_id: category2.id,
        amount: '150.00',
        period: 'monthly'
      },
      {
        user_id: user.id,
        category_id: null,
        amount: '5000.00',
        period: 'yearly'
      }
    ]).execute();

    const result = await getBudgets(user.id);

    expect(result).toHaveLength(3);

    // Verify all budgets belong to the correct user
    result.forEach(budget => {
      expect(budget.user_id).toEqual(user.id);
      expect(typeof budget.amount).toBe('number');
      expect(budget.created_at).toBeInstanceOf(Date);
      expect(budget.updated_at).toBeInstanceOf(Date);
    });

    // Check specific budget values
    const foodBudget = result.find(b => b.category_id === category1.id);
    expect(foodBudget).toBeDefined();
    expect(foodBudget!.amount).toEqual(300.00);
    expect(foodBudget!.period).toEqual('monthly');

    const transportBudget = result.find(b => b.category_id === category2.id);
    expect(transportBudget).toBeDefined();
    expect(transportBudget!.amount).toEqual(150.00);
    expect(transportBudget!.period).toEqual('monthly');

    const overallBudget = result.find(b => b.category_id === null);
    expect(overallBudget).toBeDefined();
    expect(overallBudget!.amount).toEqual(5000.00);
    expect(overallBudget!.period).toEqual('yearly');
  });

  it('should save budgets to database correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    // Create category
    const [category] = await db.insert(categoriesTable).values({
      user_id: user.id,
      name: 'Entertainment',
      color: '#0000FF',
      icon: 'entertainment'
    }).returning().execute();

    // Create budget
    const [budget] = await db.insert(budgetsTable).values({
      user_id: user.id,
      category_id: category.id,
      amount: '250.50',
      period: 'monthly'
    }).returning().execute();

    // Fetch via handler
    const result = await getBudgets(user.id);

    // Verify database state
    const dbBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.user_id, user.id))
      .execute();

    expect(dbBudgets).toHaveLength(1);
    expect(parseFloat(dbBudgets[0].amount)).toEqual(250.50);
    expect(dbBudgets[0].period).toEqual('monthly');

    // Verify handler result
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(budget.id);
    expect(result[0].amount).toEqual(250.50);
  });
});