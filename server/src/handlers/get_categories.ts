import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const getCategories = async (userId: number): Promise<Category[]> => {
  try {
    // Query categories table filtered by user_id
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, userId))
      .execute();

    // Return the results as Category array
    return results;
  } catch (error) {
    console.error('Get categories failed:', error);
    throw error;
  }
};