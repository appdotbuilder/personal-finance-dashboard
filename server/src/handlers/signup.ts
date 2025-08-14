import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignupInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export const signup = async (input: SignupInput): Promise<User> => {
  try {
    // Check if email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash the password with salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const password_hash = createHash('sha256').update(input.password + saltHex).digest('hex') + ':' + saltHex;

    // Create user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User signup failed:', error);
    throw error;
  }
};