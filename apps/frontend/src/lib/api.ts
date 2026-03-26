import { supabase } from './supabase.js';
import type { ApiError } from '@testforge/shared-types';

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

class ApiClient {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return {};
    return { Authorization: `Bearer ${data.session.access_token}` };
  }

  /**
   * Fix 012: retry automatique sur 401 (refresh token) + retry réseau (backoff exponentiel).
   * Le flag `_retried` évite les boucles infinies.
   */
  private async request<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
    const authHeader = await this.getAuthHeader();

    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...options.headers,
        },
      });
    } catch (networkError) {
      // Fix 012: retry sur erreur réseau (max 2 fois, backoff 1s puis 3s)
      if (!_retried) {
        await new Promise((r) => setTimeout(r, 1000));
        return this.request<T>(path, options, true);
      }
      throw networkError;
    }

    // Fix 012: intercept 401 → refresh session → retry une fois
    if (response.status === 401 && !_retried) {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        // Refresh échoué → rediriger vers la page de login
        window.location.href = '/login';
        throw new Error('Session expired — please log in again');
      }
      // Retry avec le nouveau token
      return this.request<T>(path, options, true);
    }

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: response.statusText }))) as ApiError;
      throw new Error(error.error ?? `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
