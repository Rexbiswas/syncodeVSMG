import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../auth.js';

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate and normalize valid registration payload', () => {
      const valid = {
        email: '  Alice@EXAMPLE.com  ',
        username: '  Alice_99  ',
        displayName: 'Alice Cooper',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      const parsed = registerSchema.parse(valid);
      expect(parsed.email).toBe('alice@example.com');
      expect(parsed.username).toBe('alice_99');
      expect(parsed.displayName).toBe('Alice Cooper');
    });

    it('should reject mismatched passwords', () => {
      const invalid = {
        email: 'alice@example.com',
        username: 'alice_99',
        password: 'Password123!',
        confirmPassword: 'MismatchPassword123!',
      };

      expect(() => registerSchema.parse(invalid)).toThrow();
    });

    it('should reject weak passwords lacking numbers or special characters', () => {
      const weak = {
        email: 'alice@example.com',
        username: 'alice_99',
        password: 'onlylowercase',
        confirmPassword: 'onlylowercase',
      };

      expect(() => registerSchema.parse(weak)).toThrow();
    });

    it('should reject invalid username characters', () => {
      const invalid = {
        email: 'alice@example.com',
        username: 'alice@invalid!',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      expect(() => registerSchema.parse(invalid)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid email or username', () => {
      expect(loginSchema.parse({ emailOrUsername: 'alice@example.com', password: 'pwd' })).toEqual({
        emailOrUsername: 'alice@example.com',
        password: 'pwd',
      });
      expect(loginSchema.parse({ emailOrUsername: 'alice_99', password: 'pwd' })).toEqual({
        emailOrUsername: 'alice_99',
        password: 'pwd',
      });
    });

    it('should reject empty credentials', () => {
      expect(() => loginSchema.parse({ emailOrUsername: '', password: '' })).toThrow();
    });
  });

  describe('changePasswordSchema', () => {
    it('should reject new password if identical to current password', () => {
      const payload = {
        currentPassword: 'Password123!',
        newPassword: 'Password123!',
        confirmNewPassword: 'Password123!',
      };
      expect(() => changePasswordSchema.parse(payload)).toThrow();
    });

    it('should accept distinct and strong new password', () => {
      const payload = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456#',
        confirmNewPassword: 'NewPassword456#',
      };
      const parsed = changePasswordSchema.parse(payload);
      expect(parsed.newPassword).toBe('NewPassword456#');
    });
  });

  describe('updateProfileSchema', () => {
    it('should allow valid profile updates', () => {
      const payload = {
        displayName: 'Alice In Tech',
        username: 'alice_tech',
        avatarUrl: 'https://example.com/avatar.png',
      };
      const parsed = updateProfileSchema.parse(payload);
      expect(parsed.displayName).toBe('Alice In Tech');
      expect(parsed.username).toBe('alice_tech');
    });
  });
});
