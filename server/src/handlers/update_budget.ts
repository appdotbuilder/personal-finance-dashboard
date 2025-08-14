import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { type UpdateBudgetInput, type Budget } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateBudget = async (input: UpdateBudgetInput): Promise<Budget> => {
  try {
    // First, verify the budget exists and get current data
    const existingBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, input.id))
      .execute();

    if (existingBudgets.length === 0) {
      throw new Error('Budget not found');
    }

    const existingBudget = existingBudgets[0];

    // Verify category exists if provided
    if (input.category_id !== undefined && input.category_id !== null) {
      const categories = await db.select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, input.category_id),
            eq(categoriesTable.user_id, existingBudget.user_id)
          )
        )
        .execute();

      if (categories.length === 0) {
        throw new Error('Category not found or does not belong to user');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.period !== undefined) {
      updateData.period = input.period;
    }

    // Update the budget
    const result = await db.update(budgetsTable)
      .set(updateData)
      .where(eq(budgetsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const budget = result[0];
    return {
      ...budget,
      amount: parseFloat(budget.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Budget update failed:', error);
    throw error;
  }
};