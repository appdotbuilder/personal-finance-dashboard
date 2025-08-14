import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignupInput } from '../schema';
import { signup } from '../handlers/signup';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test input data
const testInput: SignupInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  first_name: 'John',
  last_name: 'Doe'
};

const secondUserInput: SignupInput = {
  email: 'jane@example.com',
  password: 'anotherpassword456',
  first_name: 'Jane',
  last_name: 'Smith'
};

describe('signup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await signup(testInput);

    // Verify basic fields
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password is hashed (not the original password)
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('securepassword123');
    expect(result.password_hash.length).toBeGreaterThan(60); // SHA256 hash + salt should be ~96 chars
  });

  it('should save user to database correctly', async () => {
    const result = await signup(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await signup(testInput);

    // Helper function to verify password
    const verifyPassword = (password: string, hash: string): boolean => {
      const [hashPart, salt] = hash.split(':');
      const expectedHash = createHash('sha256').update(password + salt).digest('hex');
      return expectedHash === hashPart;
    };

    // Verify the password hash can be validated
    const isValid = verifyPassword('securepassword123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = verifyPassword('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await signup(testInput);

    // Attempt to create second user with same email
    const duplicateInput: SignupInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'Name'
    };

    await expect(signup(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should create multiple users with different emails', async () => {
    // Create first user
    const firstUser = await signup(testInput);
    
    // Create second user with different email
    const secondUser = await signup(secondUserInput);

    // Verify both users were created with different IDs
    expect(firstUser.id).not.toEqual(secondUser.id);
    expect(firstUser.email).toEqual('test@example.com');
    expect(secondUser.email).toEqual('jane@example.com');

    // Verify both exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);

    const emails = allUsers.map(user => user.email).sort();
    expect(emails).toEqual(['jane@example.com', 'test@example.com']);
  });

  it('should set timestamps correctly', async () => {
    const beforeSignup = new Date();
    const result = await signup(testInput);
    const afterSignup = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeSignup.getTime() - 1000); // Allow 1s margin
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterSignup.getTime() + 1000);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeSignup.getTime() - 1000);
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterSignup.getTime() + 1000);

    // Verify created_at and updated_at are the same for new records
    expect(Math.abs(result.created_at.getTime() - result.updated_at.getTime())).toBeLessThan(1000);
  });
});