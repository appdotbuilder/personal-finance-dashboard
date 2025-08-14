import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

// Test user data
const testUser = {
  email: 'john.doe@example.com',
  password_hash: 'hashed_password_123', // In production, this would be a bcrypt hash
  first_name: 'John',
  last_name: 'Doe'
};

const validLoginInput: LoginInput = {
  email: 'john.doe@example.com',
  password: 'validpassword123' // 8+ characters to pass our simple validation
};

const invalidLoginInput: LoginInput = {
  email: 'john.doe@example.com',
  password: 'short' // Less than 8 characters to simulate password verification failure
};

const nonExistentUserInput: LoginInput = {
  email: 'nonexistent@example.com',
  password: 'validpassword123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await login(validLoginInput);

    // Verify returned user data
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // In production, password_hash should NOT be returned
    // For now, we're including it in the response for testing
    expect(result.password_hash).toEqual('hashed_password_123');
  });

  it('should reject login with invalid password', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Should throw error for invalid password (too short in our simulation)
    await expect(login(invalidLoginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login for non-existent user', async () => {
    // Don't create any user in database
    
    // Should throw error for non-existent email
    await expect(login(nonExistentUserInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should find user in database correctly', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];

    const result = await login(validLoginInput);

    // Verify the correct user was found and returned
    expect(result.id).toEqual(createdUser.id);
    expect(result.email).toEqual(createdUser.email);
    expect(result.first_name).toEqual(createdUser.first_name);
    expect(result.last_name).toEqual(createdUser.last_name);
  });

  it('should handle multiple users correctly', async () => {
    // Create multiple test users
    await db.insert(usersTable)
      .values([
        testUser,
        {
          email: 'jane.smith@example.com',
          password_hash: 'different_hash',
          first_name: 'Jane',
          last_name: 'Smith'
        }
      ])
      .execute();

    const result = await login(validLoginInput);

    // Should return the correct user (John, not Jane)
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
  });
});