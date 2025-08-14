import { db } from '../db';
import { budgetsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateBudgetInput, type Budget } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  try {
    // Validate user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Validate category exists if provided
    if (input.category_id !== null) {
      const categories = await db.select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, input.category_id),
            eq(categoriesTable.user_id, input.user_id)
          )
        )
        .execute();

      if (categories.length === 0) {
        throw new Error('Category not found or does not belong to user');
      }
    }

    // Check for existing budget for same user/category/period combination
    const existingBudgets = await db.select()
      .from(budgetsTable)
      .where(
        and(
          eq(budgetsTable.user_id, input.user_id),
          input.category_id === null 
            ? isNull(budgetsTable.category_id)
            : eq(budgetsTable.category_id, input.category_id),
          eq(budgetsTable.period, input.period)
        )
      )
      .execute();

    if (existingBudgets.length > 0) {
      throw new Error('Budget already exists for this user, category, and period');
    }

    // Insert budget record
    const result = await db.insert(budgetsTable)
      .values({
        user_id: input.user_id,
        category_id: input.category_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        period: input.period
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const budget = result[0];
    return {
      ...budget,
      amount: parseFloat(budget.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Budget creation failed:', error);
    throw error;
  }
};