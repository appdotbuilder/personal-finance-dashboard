import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, budgetsTable, transactionsTable } from '../db/schema';
import { getBudgetAlerts } from '../handlers/get_budget_alerts';

describe('getBudgetAlerts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no budgets', async () => {
    // Create user without budgets
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const alerts = await getBudgetAlerts(userResult[0].id);
    expect(alerts).toEqual([]);
  });

  it('should return alerts for budgets over 80% threshold', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        color: '#ff0000',
        icon: 'food'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create monthly budget of $1000
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '1000.00', // Convert to string for numeric column
        period: 'monthly'
      })
      .returning()
      .execute();

    const budgetId = budgetResult[0].id;

    // Create expense transactions totaling $850 (85% of budget) in current month
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 15); // Mid-month

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '400.00',
          description: 'Groceries',
          date: currentDate
        },
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '450.00',
          description: 'Restaurant',
          date: currentDate
        }
      ])
      .execute();

    const alerts = await getBudgetAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].budget_id).toBe(budgetId);
    expect(alerts[0].category_name).toBe('Food');
    expect(alerts[0].budget_amount).toBe(1000);
    expect(alerts[0].spent_amount).toBe(850);
    expect(alerts[0].percentage_used).toBe(85);
    expect(alerts[0].period).toBe('monthly');
  });

  it('should not return alerts for budgets under 80% threshold', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        color: '#ff0000',
        icon: 'food'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create monthly budget of $1000
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '1000.00',
        period: 'monthly'
      })
      .returning()
      .execute();

    // Create expense transactions totaling $700 (70% of budget)
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 15);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '300.00',
          description: 'Groceries',
          date: currentDate
        },
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '400.00',
          description: 'Restaurant',
          date: currentDate
        }
      ])
      .execute();

    const alerts = await getBudgetAlerts(userId);
    expect(alerts).toEqual([]);
  });

  it('should handle yearly budget periods correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Entertainment',
        color: '#00ff00',
        icon: 'entertainment'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create yearly budget of $5000
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '5000.00',
        period: 'yearly'
      })
      .returning()
      .execute();

    const budgetId = budgetResult[0].id;

    // Create expense transactions totaling $4500 (90% of yearly budget)
    const currentYear = new Date().getFullYear();
    const transactionDate = new Date(currentYear, 5, 15); // June 15th

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '2000.00',
          description: 'Vacation',
          date: transactionDate
        },
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '2500.00',
          description: 'Entertainment',
          date: transactionDate
        }
      ])
      .execute();

    const alerts = await getBudgetAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].budget_id).toBe(budgetId);
    expect(alerts[0].category_name).toBe('Entertainment');
    expect(alerts[0].budget_amount).toBe(5000);
    expect(alerts[0].spent_amount).toBe(4500);
    expect(alerts[0].percentage_used).toBe(90);
    expect(alerts[0].period).toBe('yearly');
  });

  it('should handle budgets without categories (overall budget)', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create overall monthly budget (no category)
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: null, // Overall budget
        amount: '2000.00',
        period: 'monthly'
      })
      .returning()
      .execute();

    const budgetId = budgetResult[0].id;

    // Create expense transactions from different categories totaling $1700 (85%)
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 15);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: null,
          type: 'expense',
          amount: '800.00',
          description: 'Uncategorized expense 1',
          date: currentDate
        },
        {
          user_id: userId,
          category_id: null,
          type: 'expense',
          amount: '900.00',
          description: 'Uncategorized expense 2',
          date: currentDate
        }
      ])
      .execute();

    const alerts = await getBudgetAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].budget_id).toBe(budgetId);
    expect(alerts[0].category_name).toBeNull();
    expect(alerts[0].budget_amount).toBe(2000);
    expect(alerts[0].spent_amount).toBe(1700);
    expect(alerts[0].percentage_used).toBe(85);
    expect(alerts[0].period).toBe('monthly');
  });

  it('should sort alerts by percentage used (highest first)', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple categories
    const categoriesResult = await db.insert(categoriesTable)
      .values([
        {
          user_id: userId,
          name: 'Food',
          color: '#ff0000',
          icon: 'food'
        },
        {
          user_id: userId,
          name: 'Transport',
          color: '#00ff00',
          icon: 'transport'
        }
      ])
      .returning()
      .execute();

    const foodCategoryId = categoriesResult[0].id;
    const transportCategoryId = categoriesResult[1].id;

    // Create budgets
    await db.insert(budgetsTable)
      .values([
        {
          user_id: userId,
          category_id: foodCategoryId,
          amount: '1000.00',
          period: 'monthly'
        },
        {
          user_id: userId,
          category_id: transportCategoryId,
          amount: '500.00',
          period: 'monthly'
        }
      ])
      .execute();

    // Create transactions
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 15);

    // Food: $850 spent (85%)
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: foodCategoryId,
        type: 'expense',
        amount: '850.00',
        description: 'Food expenses',
        date: currentDate
      })
      .execute();

    // Transport: $475 spent (95%)
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        category_id: transportCategoryId,
        type: 'expense',
        amount: '475.00',
        description: 'Transport expenses',
        date: currentDate
      })
      .execute();

    const alerts = await getBudgetAlerts(userId);

    expect(alerts).toHaveLength(2);
    
    // Should be sorted by percentage used (highest first)
    expect(alerts[0].category_name).toBe('Transport');
    expect(alerts[0].percentage_used).toBe(95);
    
    expect(alerts[1].category_name).toBe('Food');
    expect(alerts[1].percentage_used).toBe(85);
  });

  it('should only include expense transactions in calculations', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        color: '#ff0000',
        icon: 'food'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create monthly budget of $1000
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '1000.00',
        period: 'monthly'
      })
      .returning()
      .execute();

    // Create mixed transactions
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 15);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '850.00',
          description: 'Food expense',
          date: currentDate
        },
        {
          user_id: userId,
          category_id: categoryId,
          type: 'income', // This should not be counted
          amount: '200.00',
          description: 'Food-related income',
          date: currentDate
        }
      ])
      .execute();

    const alerts = await getBudgetAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].spent_amount).toBe(850); // Only expense should be counted
    expect(alerts[0].percentage_used).toBe(85);
  });

  it('should only consider transactions within budget period', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        color: '#ff0000',
        icon: 'food'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create monthly budget of $1000
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '1000.00',
        period: 'monthly'
      })
      .returning()
      .execute();

    // Create transactions in different months
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 15);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '850.00',
          description: 'Current month expense',
          date: currentMonthDate
        },
        {
          user_id: userId,
          category_id: categoryId,
          type: 'expense',
          amount: '500.00', // This should not be counted
          description: 'Last month expense',
          date: lastMonthDate
        }
      ])
      .execute();

    const alerts = await getBudgetAlerts(userId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].spent_amount).toBe(850); // Only current month should be counted
    expect(alerts[0].percentage_used).toBe(85);
  });
});