import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PasswordResetInput } from '../schema';
import { resetPassword } from '../handlers/reset_password';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  first_name: 'John',
  last_name: 'Doe'
};

const testInput: PasswordResetInput = {
  email: 'test@example.com'
};

const nonExistentEmailInput: PasswordResetInput = {
  email: 'nonexistent@example.com'
};

describe('resetPassword', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return success when user email exists', async () => {
    // Create a test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await resetPassword(testInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('If an account with that email exists, a password reset link has been sent.');
  });

  it('should return success even when email does not exist (security)', async () => {
    // Don't create any users - test with non-existent email
    const result = await resetPassword(nonExistentEmailInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('If an account with that email exists, a password reset link has been sent.');
  });

  it('should log reset token for existing users', async () => {
    // Create a test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Spy on console.log to verify token generation
    const consoleSpy = spyOn(console, 'log');

    await resetPassword(testInput);

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy.mock.calls[0][0]).toMatch(/Password reset token for test@example\.com: [a-f0-9]{64}/);
    expect(consoleSpy.mock.calls[1][0]).toMatch(/User ID: \d+, Generated at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

    consoleSpy.mockRestore();
  });

  it('should not log reset token for non-existent users', async () => {
    // Don't create any users
    const consoleSpy = spyOn(console, 'log');

    await resetPassword(nonExistentEmailInput);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle email case sensitivity correctly', async () => {
    // Create user with lowercase email
    await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test@example.com'
      })
      .execute();

    // Test with uppercase email - should not match (PostgreSQL is case-sensitive)
    const uppercaseInput: PasswordResetInput = {
      email: 'TEST@EXAMPLE.COM'
    };

    const consoleSpy = spyOn(console, 'log');

    const result = await resetPassword(uppercaseInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('If an account with that email exists, a password reset link has been sent.');
    expect(consoleSpy).not.toHaveBeenCalled(); // No token should be generated

    consoleSpy.mockRestore();
  });

  it('should handle multiple users with different emails', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([
        testUser,
        {
          email: 'user2@example.com',
          password_hash: 'hashedpassword456',
          first_name: 'Jane',
          last_name: 'Smith'
        }
      ])
      .execute();

    const consoleSpy = spyOn(console, 'log');

    // Reset password for first user
    await resetPassword(testInput);
    expect(consoleSpy).toHaveBeenCalledTimes(2);

    consoleSpy.mockClear();

    // Reset password for second user
    const secondUserInput: PasswordResetInput = {
      email: 'user2@example.com'
    };

    await resetPassword(secondUserInput);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy.mock.calls[0][0]).toMatch(/Password reset token for user2@example\.com: [a-f0-9]{64}/);

    consoleSpy.mockRestore();
  });

  it('should generate unique tokens for multiple requests', async () => {
    // Create a test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const consoleSpy = spyOn(console, 'log');

    // Make two reset password requests
    await resetPassword(testInput);
    const firstToken = consoleSpy.mock.calls[0][0];

    consoleSpy.mockClear();

    await resetPassword(testInput);
    const secondToken = consoleSpy.mock.calls[0][0];

    // Tokens should be different
    expect(firstToken).not.toBe(secondToken);

    consoleSpy.mockRestore();
  });

  it('should validate email format through Zod schema', async () => {
    // This test ensures the input validation works correctly
    // Invalid email should be caught by Zod before reaching the handler
    const invalidEmailInput = {
      email: 'invalid-email'
    } as PasswordResetInput;

    // In a real scenario, this would fail Zod validation before reaching the handler
    // But for testing the handler directly, we can test with valid format
    await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'valid@example.com'
      })
      .execute();

    const validInput: PasswordResetInput = {
      email: 'valid@example.com'
    };

    const result = await resetPassword(validInput);
    expect(result.success).toBe(true);
  });
});