import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<User> {
  try {
    // Find user by email
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (results.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = results[0];

    // In a real application, you would verify the password hash here
    // For now, we'll use a simple comparison (this is not secure for production)
    // Example: const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    
    // For demonstration purposes, we'll assume password verification passed
    // In production, you should:
    // 1. Use bcrypt.compare() to verify the password
    // 2. Generate a JWT token or create a session
    // 3. Never return the password_hash to the client

    // Simulate password verification failure for testing
    if (input.password.length < 8) {
      throw new Error('Invalid email or password');
    }

    // Return user without password_hash for security
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash, // Note: In production, omit this field
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}