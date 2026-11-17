import type {
  AuthUser,
  SessionItem,
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from '@syncode/validation';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class AuthApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  }

  setAccessToken(token: string | null) {
    this.token = token;
  }

  getAccessToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Ensures HttpOnly cookies are attached
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${res.status}`,
            message: json?.message || res.statusText || 'Request failed',
          },
        };
      }

      return json as ApiResponse<T>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Unable to connect to server: ${msg}`,
        },
      };
    }
  }

  async register(data: RegisterInput): Promise<ApiResponse<{ user: AuthUser; accessToken: string; expiresIn: number }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginInput): Promise<ApiResponse<{ user: AuthUser; accessToken: string; expiresIn: number }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refresh(): Promise<ApiResponse<{ user: AuthUser; accessToken: string; expiresIn: number }>> {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const res = await this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    this.setAccessToken(null);
    return res;
  }

  async logoutAll(): Promise<ApiResponse<{ revokedCount: number }>> {
    const res = await this.request<{ revokedCount: number }>('/auth/logout-all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    this.setAccessToken(null);
    return res;
  }

  async getMe(): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>('/auth/me', {
      method: 'GET',
    });
  }

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string, confirmNewPassword: string): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmNewPassword }),
    });
  }

  async changePassword(data: ChangePasswordInput): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>('/users/me', {
      method: 'GET',
    });
  }

  async updateProfile(data: UpdateProfileInput): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getSessions(): Promise<ApiResponse<SessionItem[]>> {
    return this.request<SessionItem[]>('/users/me/sessions', {
      method: 'GET',
    });
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/me/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }
}

export const authApi = new AuthApiClient();
