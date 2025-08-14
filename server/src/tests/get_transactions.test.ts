import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetTransactionsInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'User'
};

const testCategory = {
  name: 'Groceries',
  color: '#00FF00',
  icon: 'shopping-cart'
};

describe('getTransactions', () => {
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

    // Create test transactions
    const baseDate = new Date('2024-01-15');
    const transactions = [
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '25.50',
        description: 'Weekly grocery shopping',
        date: baseDate
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '150.00',
        description: 'Big grocery haul',
        date: new Date('2024-01-20')
      },
      {
        user_id: userId,
        category_id: null,
        type: 'income' as const,
        amount: '2500.00',
        description: 'Salary payment',
        date: new Date('2024-01-01')
      },
      {
        user_id: userId,
        category_id: categoryId,
        type: 'expense' as const,
        amount: '75.25',
        description: 'Restaurant dinner',
        date: new Date('2024-01-25')
      }
    ];

    await db.insert(transactionsTable).values(transactions).execute();
  });

  afterEach(resetDB);

  it('should get all transactions for a user', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(4);
    expect(result[0].user_id).toEqual(userId);
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    
    // Should be ordered by date desc, then id desc
    expect(result[0].date >= result[1].date).toBe(true);
  });

  it('should filter by date range', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      start_date: new Date('2024-01-10'),
      end_date: new Date('2024-01-25'),
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.date >= new Date('2024-01-10')).toBe(true);
      expect(transaction.date <= new Date('2024-01-25')).toBe(true);
    });
  });

  it('should filter by category', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      category_id: categoryId,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.category_id).toEqual(categoryId);
    });
  });

  it('should filter by transaction type', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      type: 'expense',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.type).toEqual('expense');
    });
  });

  it('should filter by amount range', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      min_amount: 50,
      max_amount: 200,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.amount).toBeGreaterThanOrEqual(50);
      expect(transaction.amount).toBeLessThanOrEqual(200);
    });
  });

  it('should search by description', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      search: 'grocery',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.description.toLowerCase()).toContain('grocery');
    });
  });

  it('should search by description case insensitive', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      search: 'GROCERY',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.description.toLowerCase()).toContain('grocery');
    });
  });

  it('should apply pagination', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      limit: 2,
      offset: 1,
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
  });

  it('should combine multiple filters', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      type: 'expense',
      category_id: categoryId,
      min_amount: 20,
      max_amount: 100,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.type).toEqual('expense');
      expect(transaction.category_id).toEqual(categoryId);
      expect(transaction.amount).toBeGreaterThanOrEqual(20);
      expect(transaction.amount).toBeLessThanOrEqual(100);
      expect(transaction.date >= new Date('2024-01-01')).toBe(true);
      expect(transaction.date <= new Date('2024-01-31')).toBe(true);
    });
  });

  it('should return empty array when no transactions match filters', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      type: 'income',
      category_id: categoryId, // Income transactions shouldn't have this category
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should handle null category_id filter correctly', async () => {
    // First verify we have transactions with null category_id
    const allInput: GetTransactionsInput = {
      user_id: userId,
      limit: 50,
      offset: 0
    };

    const allResult = await getTransactions(allInput);
    const nullCategoryTransactions = allResult.filter(t => t.category_id === null);
    expect(nullCategoryTransactions).toHaveLength(1);
  });

  it('should return transactions in correct order (newest first)', async () => {
    const input: GetTransactionsInput = {
      user_id: userId,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    // Should be ordered by date desc, then by id desc
    for (let i = 0; i < result.length - 1; i++) {
      const current = result[i];
      const next = result[i + 1];
      
      // If dates are different, current should be newer
      if (current.date.getTime() !== next.date.getTime()) {
        expect(current.date >= next.date).toBe(true);
      } else {
        // If dates are same, current id should be higher
        expect(current.id >= next.id).toBe(true);
      }
    }
  });
});