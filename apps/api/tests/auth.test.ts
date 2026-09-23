import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  verifyAccessToken,
  hashToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../src/utils/token';
import { registerSchema, loginSchema } from '../src/validators/auth.validator';
import { requireRole } from '../src/middleware/rbac.middleware';
import { UserRoleEnum } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../src/utils/errors';

describe('Auth Utilities & Security', () => {
  it('should correctly hash and verify passwords with bcrypt', async () => {
    const rawPassword = 'SecurePassword@123';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await comparePassword('WrongPassword@999', hash);
    expect(isWrong).toBe(false);
  });

  it('should generate and verify valid JWT access tokens', () => {
    const payload = {
      userId: 'usr-12345',
      email: 'tester@feastflow.com',
      roles: [UserRoleEnum.CUSTOMER],
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.roles).toContain(UserRoleEnum.CUSTOMER);
  });

  it('should produce deterministic SHA-256 hashes for refresh tokens', () => {
    const raw = 'random-token-string-xyz';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // 256 bits = 64 hex characters
  });

  it('should generate and verify password reset tokens', () => {
    const userId = 'usr-reset-target';
    const resetToken = generatePasswordResetToken(userId);
    const verified = verifyPasswordResetToken(resetToken);

    expect(verified.userId).toBe(userId);
  });
});

describe('Auth Input Validation Schemas', () => {
  it('should reject registration if password does not meet complexity requirements', () => {
    const weakData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'weak', // too short, no uppercase, no numbers
      role: UserRoleEnum.CUSTOMER,
    };

    const result = registerSchema.safeParse(weakData);
    expect(result.success).toBe(false);
  });

  it('should reject direct registration with ADMIN role', () => {
    const adminData = {
      name: 'Malicious Admin',
      email: 'attacker@example.com',
      password: 'StrongPassword123!',
      role: UserRoleEnum.ADMIN,
    };

    const result = registerSchema.safeParse(adminData);
    expect(result.success).toBe(false);
  });

  it('should accept valid customer registration payload', () => {
    const validData = {
      name: 'Valid Customer',
      email: 'customer@example.com',
      password: 'StrongPassword123!',
      phone: '+15551234567',
      role: UserRoleEnum.CUSTOMER,
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate login credentials schema', () => {
    const validLogin = {
      email: 'user@example.com',
      password: 'Password@123',
    };

    const result = loginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);

    const invalidLogin = {
      email: 'not-an-email',
      password: '',
    };
    expect(loginSchema.safeParse(invalidLogin).success).toBe(false);
  });
});

describe('RBAC Middleware', () => {
  it('should throw UnauthorizedError when user is not attached to request', () => {
    const middleware = requireRole(UserRoleEnum.ADMIN);
    const req = {} as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
  });

  it('should throw ForbiddenError when user does not have the required role', () => {
    const middleware = requireRole(UserRoleEnum.ADMIN);
    const req = {
      user: {
        id: 'usr-1',
        email: 'user@test.com',
        name: 'Normal User',
        roles: [UserRoleEnum.CUSTOMER],
        isEmailVerified: true,
      },
    } as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
  });

  it('should call next() when user has one of the allowed roles', () => {
    const middleware = requireRole(UserRoleEnum.ADMIN, UserRoleEnum.RESTAURANT_OWNER);
    const req = {
      user: {
        id: 'usr-owner-1',
        email: 'owner@test.com',
        name: 'Restaurant Owner',
        roles: [UserRoleEnum.RESTAURANT_OWNER],
        isEmailVerified: true,
      },
    } as Request;
    const res = {} as Response;
    let nextCalled = false;
    const next = (() => {
      nextCalled = true;
    }) as NextFunction;

    middleware(req, res, next);
    expect(nextCalled).toBe(true);
  });
});
