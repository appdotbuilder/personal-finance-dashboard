import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function deleteCategory(categoryId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // First, verify category exists and belongs to user
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(and(
        eq(categoriesTable.id, categoryId),
        eq(categoriesTable.user_id, userId)
      ))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error('Category not found or does not belong to user');
    }

    // Update all transactions that reference this category to set category_id to null
    await db.update(transactionsTable)
      .set({ category_id: null })
      .where(eq(transactionsTable.category_id, categoryId))
      .execute();

    // Delete the category
    await db.delete(categoriesTable)
      .where(and(
        eq(categoriesTable.id, categoryId),
        eq(categoriesTable.user_id, userId)
      ))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}