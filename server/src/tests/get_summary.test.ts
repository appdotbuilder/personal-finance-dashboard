import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetSummaryInput } from '../schema';
import { getSummary } from '../handlers/get_summary';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User'
};

const testCategory = {
  name: 'Food',
  color: '#FF0000',
  icon: '🍔'
};

describe('getSummary', () => {
  let userId: number;
  let categoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        ...testCategory,
        user_id: userId
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  it('should generate monthly summary correctly', async () => {
    // Create test transactions for January 2024
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '3000.00',
        description: 'Salary',
        date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '500.00',
        description: 'Food expenses',
        date: new Date('2024-01-10')
      },
      {
        user_id: userId,
        category_id: null,
        type: 'expense' as const,
        amount: '200.00',
        description: 'Uncategorized',
        date: new Date('2024-01-20')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetSummaryInput = {
      user_id: userId,
      period: 'monthly',
      year: 2024,
      month: 1
    };

    const result = await getSummary(input);

    expect(result.total_income).toEqual(3000);
    expect(result.total_expenses).toEqual(700);
    expect(result.net_income).toEqual(2300);
    expect(result.categories).toHaveLength(2);
    expect(result.monthly_data).toBeUndefined();

    // Check category breakdown
    const foodCategory = result.categories.find(c => c.category_id === categoryId);
    expect(foodCategory).toBeDefined();
    expect(foodCategory!.category_name).toEqual('Food');
    expect(foodCategory!.total_amount).toEqual(3500); // 3000 income + 500 expense
    expect(foodCategory!.transaction_count).toEqual(2);

    const uncategorized = result.categories.find(c => c.category_id === null);
    expect(uncategorized).toBeDefined();
    expect(uncategorized!.category_name).toBeNull();
    expect(uncategorized!.total_amount).toEqual(200);
    expect(uncategorized!.transaction_count).toEqual(1);
  });

  it('should generate yearly summary with monthly data', async () => {
    // Create test transactions across different months
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '3000.00',
        description: 'January salary',
        date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '500.00',
        description: 'January food',
        date: new Date('2024-01-10')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '3200.00',
        description: 'February salary',
        date: new Date('2024-02-15')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '600.00',
        description: 'February food',
        date: new Date('2024-02-10')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetSummaryInput = {
      user_id: userId,
      period: 'yearly',
      year: 2024
    };

    const result = await getSummary(input);

    expect(result.total_income).toEqual(6200);
    expect(result.total_expenses).toEqual(1100);
    expect(result.net_income).toEqual(5100);
    expect(result.monthly_data).toBeDefined();
    expect(result.monthly_data).toHaveLength(12);

    // Check January data
    const januaryData = result.monthly_data!.find(m => m.month === 1);
    expect(januaryData).toBeDefined();
    expect(januaryData!.income).toEqual(3000);
    expect(januaryData!.expenses).toEqual(500);

    // Check February data
    const februaryData = result.monthly_data!.find(m => m.month === 2);
    expect(februaryData).toBeDefined();
    expect(februaryData!.income).toEqual(3200);
    expect(februaryData!.expenses).toEqual(600);

    // Check that unused months have zero values
    const marchData = result.monthly_data!.find(m => m.month === 3);
    expect(marchData).toBeDefined();
    expect(marchData!.income).toEqual(0);
    expect(marchData!.expenses).toEqual(0);
  });

  it('should return empty summary for user with no transactions', async () => {
    const input: GetSummaryInput = {
      user_id: userId,
      period: 'monthly',
      year: 2024,
      month: 1
    };

    const result = await getSummary(input);

    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(0);
    expect(result.categories).toHaveLength(0);
    expect(result.monthly_data).toBeUndefined();
  });

  it('should filter transactions by date range correctly', async () => {
    // Create transactions in different months
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '1000.00',
        description: 'December 2023',
        date: new Date('2023-12-31')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '2000.00',
        description: 'January 2024',
        date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '300.00',
        description: 'January 2024',
        date: new Date('2024-01-20')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '1500.00',
        description: 'February 2024',
        date: new Date('2024-02-01')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetSummaryInput = {
      user_id: userId,
      period: 'monthly',
      year: 2024,
      month: 1
    };

    const result = await getSummary(input);

    // Should only include January 2024 transactions
    expect(result.total_income).toEqual(2000);
    expect(result.total_expenses).toEqual(300);
    expect(result.net_income).toEqual(1700);
  });

  it('should handle different transaction types correctly', async () => {
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '5000.00',
        description: 'Salary',
        date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '500.00',
        description: 'Bonus',
        date: new Date('2024-01-20')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '1200.00',
        description: 'Rent',
        date: new Date('2024-01-01')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '300.00',
        description: 'Utilities',
        date: new Date('2024-01-05')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetSummaryInput = {
      user_id: userId,
      period: 'monthly',
      year: 2024,
      month: 1
    };

    const result = await getSummary(input);

    expect(result.total_income).toEqual(5500);
    expect(result.total_expenses).toEqual(1500);
    expect(result.net_income).toEqual(4000);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].total_amount).toEqual(7000); // Sum of all transactions
    expect(result.categories[0].transaction_count).toEqual(4);
  });

  it('should throw error for monthly period without month', async () => {
    const input = {
      user_id: userId,
      period: 'monthly' as const,
      year: 2024
      // month is missing
    };

    await expect(getSummary(input as GetSummaryInput)).rejects.toThrow(/month is required/i);
  });

  it('should handle decimal amounts correctly', async () => {
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '2500.75',
        description: 'Freelance work',
        date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '99.99',
        description: 'Coffee',
        date: new Date('2024-01-10')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetSummaryInput = {
      user_id: userId,
      period: 'monthly',
      year: 2024,
      month: 1
    };

    const result = await getSummary(input);

    expect(result.total_income).toEqual(2500.75);
    expect(result.total_expenses).toEqual(99.99);
    expect(result.net_income).toEqual(2400.76);
  });

  it('should only include transactions for specified user', async () => {
    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password_hash: 'hashed',
        first_name: 'Another',
        last_name: 'User'
      })
      .returning()
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    // Create transactions for both users
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'income' as const,
        amount: '1000.00',
        description: 'User 1 income',
        date: new Date('2024-01-15')
      },
      {
        user_id: anotherUserId,
        category_id: null,
        type: 'income' as const,
        amount: '2000.00',
        description: 'User 2 income',
        date: new Date('2024-01-15')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetSummaryInput = {
      user_id: userId,
      period: 'monthly',
      year: 2024,
      month: 1
    };

    const result = await getSummary(input);

    // Should only include transactions for userId, not anotherUserId
    expect(result.total_income).toEqual(1000);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].category_name).toEqual('Food');
  });
});