import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../lib/auth-api';

describe('@syncode/web - AuthApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authApi.setAccessToken(null);
  });

  it('should authenticate user and handle login response', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: 'mock-access-token-123',
        expiresIn: 900,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as Response);

    const res = await authApi.login({
      emailOrUsername: 'alice@example.com',
      password: 'Password123!',
    });

    expect(res.success).toBe(true);
    expect(res.data?.user.username).toBe('alice');
    expect(res.data?.accessToken).toBe('mock-access-token-123');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('should register a new user successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: {
          id: 'user-2',
          email: 'bob@example.com',
          username: 'bob_builder',
          displayName: 'Bob Builder',
          avatarUrl: null,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: 'mock-access-token-456',
        expiresIn: 900,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as Response);

    const res = await authApi.register({
      email: 'bob@example.com',
      username: 'bob_builder',
      displayName: 'Bob Builder',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    expect(res.success).toBe(true);
    expect(res.data?.user.email).toBe('bob@example.com');
  });

  it('should attach Bearer token to authenticated requests', async () => {
    authApi.setAccessToken('my-secret-jwt-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
        },
      }),
    } as unknown as Response);

    await authApi.getMe();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-secret-jwt-token',
        }),
      }),
    );
  });

  it('should clear access token on logout', async () => {
    authApi.setAccessToken('active-token');
    expect(authApi.getAccessToken()).toBe('active-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Response);

    await authApi.logout();

    expect(authApi.getAccessToken()).toBeNull();
  });

  it('should gracefully handle network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await authApi.login({
      emailOrUsername: 'offline@example.com',
      password: 'pwd',
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NETWORK_ERROR');
    expect(res.error?.message).toContain('Unable to connect to server');
  });
});
