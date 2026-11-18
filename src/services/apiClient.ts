// Celestial HRMS - Unified Resilient API Client
// Implements JWT propagation, Single-Flight Token Refresh Concurrency, and Structured Error Handling

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const Celestial_ACCESS_TOKEN_KEY = 'orbyx_hrms_access_token';
export const Celestial_REFRESH_TOKEN_KEY = 'orbyx_hrms_refresh_token';

class ApiClient {
  private baseUrl: string = 'http://localhost:5000/api/v1';
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  private onTokenRefreshed(newToken: string) {
    this.refreshSubscribers.forEach((callback) => callback(newToken));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Executes a fetch request with automatic JWT authorization header injection
   * and single-flight token refresh retry on 401 Unauthorized responses.
   */
  async request<T>(endpoint: string, options: RequestInit = {}, isRetry: boolean = false): Promise<T> {
    const accessToken = localStorage.getItem(Celestial_ACCESS_TOKEN_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      throw new ApiError(
        'NETWORK_OFFLINE',
        'Unable to connect to Celestial backend API gateway. Please check your network connection or server status.',
        0,
        networkErr
      );
    }

    // Handle 401 Unauthorized with Single-Flight Concurrency
    if (response.status === 401 && !endpoint.includes('/auth/login') && !isRetry) {
      if (this.isRefreshing) {
        // Queue concurrent requests until the single-flight refresh finishes
        return new Promise<T>((resolve, reject) => {
          this.addRefreshSubscriber(async (newToken: string) => {
            try {
              headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
              });
              if (!retryRes.ok) {
                const errBody = await retryRes.json().catch(() => ({}));
                throw new ApiError(errBody?.error?.code || 'HTTP_ERROR', retryRes.statusText, retryRes.status, errBody);
              }
              const data = await retryRes.json();
              resolve(data.data ?? data);
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      this.isRefreshing = true;
      const refreshToken = localStorage.getItem(Celestial_REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        this.isRefreshing = false;
        this.handleSessionExpired();
        throw new ApiError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.', 401);
      }

      try {
        const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh token invalid or revoked');
        }

        const refreshData = await refreshRes.json();
        const newAccess = refreshData.data?.accessToken || refreshData.accessToken;
        const newRefresh = refreshData.data?.refreshToken || refreshData.refreshToken;

        if (!newAccess) {
          throw new Error('No access token returned from refresh endpoint');
        }

        localStorage.setItem(Celestial_ACCESS_TOKEN_KEY, newAccess);
        if (newRefresh) {
          localStorage.setItem(Celestial_REFRESH_TOKEN_KEY, newRefresh);
        }

        this.isRefreshing = false;
        this.onTokenRefreshed(newAccess);

        // One-time retry of the initial request with new token
        return this.request<T>(endpoint, options, true);
      } catch (refreshErr) {
        this.isRefreshing = false;
        this.refreshSubscribers = [];
        this.handleSessionExpired();
        throw new ApiError('SESSION_EXPIRED', 'Session refresh failed. Please sign in again.', 401);
      }
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new ApiError(
        errorJson?.error?.code || 'SERVER_ERROR',
        errorJson?.error?.message || response.statusText,
        response.status,
        errorJson
      );
    }

    const payload = await response.json();
    return payload.data ?? payload;
  }

  private handleSessionExpired() {
    localStorage.removeItem(Celestial_ACCESS_TOKEN_KEY);
    localStorage.removeItem(Celestial_REFRESH_TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('orbyx:session_expired'));
  }
}

export const apiClient = new ApiClient();

