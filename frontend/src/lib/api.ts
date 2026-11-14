import { ApiErrorResponse } from '../types/api';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, any>;

  constructor(status: number, code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let inMemoryCsrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setCsrfToken(token: string | null) {
  inMemoryCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return inMemoryCsrfToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function fetchCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch CSRF token: ${res.status}`);
    }
    const data = await res.json();
    inMemoryCsrfToken = data.csrfToken;
    return data.csrfToken;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Please check your connection.');
  }
}

export interface RequestOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

function normalizeUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (endpoint.startsWith('/api')) {
    return endpoint;
  }
  return `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = normalizeUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  const isLoginCall = url.endsWith('/auth/login');

  const makeAttempt = async (csrfTokenToSend: string | null): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (isMutating && options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (isMutating && csrfTokenToSend) {
      headers.set('X-CSRF-Token', csrfTokenToSend);
    }

    try {
      return await fetch(url, {
        ...options,
        method,
        headers,
        credentials: options.credentials || 'same-origin',
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Please check your connection.');
    }
  };

  // Ensure CSRF token is available for mutating requests
  let currentCsrf = inMemoryCsrfToken;
  if (isMutating && !currentCsrf) {
    currentCsrf = await fetchCsrfToken();
  }

  let response = await makeAttempt(currentCsrf);

  // If 403 CSRF_INVALID, refetch CSRF token and retry exactly once
  if (response.status === 403 && isMutating) {
    let errorData: ApiErrorResponse | null = null;
    try {
      const cloned = response.clone();
      errorData = await cloned.json();
    } catch {
      // not JSON
    }

    if (errorData?.error?.code === 'CSRF_INVALID') {
      const freshToken = await fetchCsrfToken();
      response = await makeAttempt(freshToken);
    }
  }

  // Handle 401
  if (response.status === 401 && !isLoginCall && !options.skipAuthRedirect) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  // Handle errors
  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // non-JSON
    }

    const code = errorData?.error?.code || 'UNKNOWN_ERROR';
    const message = errorData?.error?.message || response.statusText || 'Request failed';
    const details = errorData?.error?.details;
    throw new ApiError(response.status, code, message, details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();

  // If response includes csrfToken (login, register), update memory cache
  if (json && typeof json === 'object' && typeof json.csrfToken === 'string') {
    inMemoryCsrfToken = json.csrfToken;
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
