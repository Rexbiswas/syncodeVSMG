import { describe, it, expect } from 'vitest';
import { PasswordService } from '../auth/password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('should hash a password with Argon2id', async () => {
    const raw = 'SuperSecret123!';
    const hash = await service.hashPassword(raw);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toBe(raw);
  });

  it('should verify a valid password against its hash', async () => {
    const raw = 'SuperSecret123!';
    const hash = await service.hashPassword(raw);

    const isValid = await service.verifyPassword(raw, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const raw = 'SuperSecret123!';
    const hash = await service.hashPassword(raw);

    const isValid = await service.verifyPassword('WrongPassword999#', hash);
    expect(isValid).toBe(false);
  });

  it('should safely return false for corrupted hash', async () => {
    const isValid = await service.verifyPassword('Password123!', 'invalid_hash_string');
    expect(isValid).toBe(false);
  });
});
