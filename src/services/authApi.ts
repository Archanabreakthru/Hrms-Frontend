import { CurrentUser } from '../types/hrms';

export interface LoginResponse {
  success: boolean;
  user?: CurrentUser;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

export const authApi = {
  async login(emailOrUsername: string, password: string): Promise<LoginResponse> {
    try {
      const email = emailOrUsername.trim();

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error?.message || 'Authentication failed. Please verify your credentials.',
        };
      }

      const { user, accessToken, refreshToken, permissions } = data.data;

      // Construct verified CurrentUser context with resolved permissions
      const isSuperAdminOrBootstrap =
        user.role === 'super_admin' ||
        user.username === 'bootstrap_admin' ||
        user.email === 'arunarchana2034@gmail.com' ||
        user.email === 'admin@orbyx.internal';

      const displayName = isSuperAdminOrBootstrap
        ? 'Bootstrap Administrator'
        : (user.name || user.username || user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));

      const currentUser: CurrentUser = {
        id: user.id,
        employeeId: user.employeeId || '',
        name: displayName,
        username: user.username || (isSuperAdminOrBootstrap ? 'bootstrap_admin' : undefined),
        email: user.email,
        role: user.role,
        departmentId: user.departmentId || '',
        designationTitle: user.role === 'super_admin' ? 'Super Administrator' : 'Enterprise User',
        avatarUrl: isSuperAdminOrBootstrap
          ? `https://ui-avatars.com/api/?name=Bootstrap+Administrator&background=4f46e5&color=fff&size=256`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&size=256`,
        permissions: permissions || (user as any).permissions || [],
      };

      return {
        success: true,
        user: currentUser,
        accessToken,
        refreshToken,
      };
    } catch (err: any) {
      // In development fallback if gateway is temporarily unreachable, handle gracefully
      return {
        success: false,
        error: err.message || 'Unable to connect to Celestial authentication service.',
      };
    }
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore network errors on logout
    }
  },

  async getMe(accessToken: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      return res.ok && data.success ? data.data : null;
    } catch {
      return null;
    }
  },

  async activateAccount(token: string, password: string): Promise<{ success: boolean; error?: string; email?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error?.message || 'Account activation failed. The link may be expired or invalid.',
        };
      }
      return {
        success: true,
        email: data.data?.email,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server. Please try again later.',
      };
    }
  },

  async resendInvitation(
    employeeId: string,
    accessToken?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const res = await fetch(`${API_BASE_URL}/auth/resend-invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error?.message || 'Failed to resend account invitation.',
        };
      }
      return {
        success: true,
        message: data.data?.message || 'Invitation resent successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server.',
      };
    }
  },

  async listUsers(accessToken?: string): Promise<any[]> {
    try {
      const token = accessToken || localStorage.getItem('orbyx_hrms_access_token');
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      return res.ok && data.success && Array.isArray(data.data) ? data.data : [];
    } catch {
      return [];
    }
  },

  async updateUserRole(userId: string, role: string, accessToken?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = accessToken || localStorage.getItem('orbyx_hrms_access_token');
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Failed to update user role' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating user role' };
    }
  },
};

