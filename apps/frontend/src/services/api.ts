/**
 * IGNITRON 2K26 — Centralized API Client
 *
 * Uses relative paths by default (e.g., '/api') which are proxied
 * via Vite in development, and served from the reverse proxy/static host
 * in production.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: any,
  ) {
    const errorMsg =
      data?.error?.message ||
      data?.message ||
      (typeof data === 'string' && data.trim().length > 0 && !data.trim().startsWith('<')
        ? data.trim()
        : null) ||
      (status === 502 || status === 503 || status === 504 || status === 500
        ? 'Backend service is currently unavailable. Please verify the backend server is running.'
        : `Request failed with status ${status}: ${statusText}`);
    super(errorMsg);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    credentials: 'include', // Always send HttpOnly session cookies
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      // Read body stream exactly once as text to prevent "body stream already read"
      const rawText = await response.text();
      try {
        errorData = JSON.parse(rawText);
      } catch {
        errorData = rawText || response.statusText;
      }
    } catch {
      errorData = response.statusText;
    }
    throw new ApiError(response.status, response.statusText, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Safely parse JSON response body with single-read protection
  const rawText = await response.text();
  if (!rawText || !rawText.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return rawText as unknown as T;
  }
}
