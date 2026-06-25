import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, Tokens } from '@/types';
import { MOCK_MODE } from './mock-data';
import { mockGet, mockPost, mockPut, mockDelete } from './mock-api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_V1 = `${API_BASE}/api/v1`;

// --- token storage --------------------------------------------------------
const ACCESS_KEY = 'cv_access_token';
const REFRESH_KEY = 'cv_refresh_token';

export const tokenStore = {
  get access(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: Pick<Tokens, 'access_token' | 'refresh_token'>) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
    window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  setAccess(access: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_KEY, access);
  },
  clear() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

// --- axios instance with refresh queue ------------------------------------
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_V1,
  timeout: 30_000,
});

// In MOCK_MODE, every request is short-circuited to the in-memory mock router.
// We expose the same shape ({ get, post, put, delete }) so React Query, the
// auth/upload stores, and every component work unchanged.
type MockApi = {
  get: (url: string, config?: unknown) => Promise<unknown>;
  post: (url: string, body?: unknown, config?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown, config?: unknown) => Promise<unknown>;
  delete: (url: string, config?: unknown) => Promise<unknown>;
};

const mockApi: MockApi = {
  get: (url) => mockGet(url),
  post: (url, body) => mockPost(url, body),
  put: (url, body) => mockPut(url, body),
  delete: (url) => mockDelete(url),
};

export const api = (MOCK_MODE ? (mockApi as unknown as AxiosInstance) : axiosInstance);

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribe(cb: (token: string | null) => void): void {
  refreshSubscribers.push(cb);
}

function flushSubscribers(token: string | null): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Interceptors are only attached to the real axios instance — the mock router
// doesn't need them (no JWT, no refresh dance).
if (!MOCK_MODE) {
  axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const access = tokenStore.access;
    if (access && config.headers) {
      config.headers['Authorization'] = `Bearer ${access}`;
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refresh = tokenStore.refresh;
    if (!refresh) {
      tokenStore.clear();
      return Promise.reject(error);
    }

    original._retry = true;
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribe((token) => {
          if (token) {
            original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
            resolve(api(original));
          } else {
            reject(error);
          }
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post<ApiResponse<{ access_token: string; expires_in: number }>>(
        `${API_V1}/auth/refresh`,
        { refresh_token: refresh },
      );
      if (!data.success) throw new Error('refresh failed');
      const newAccess = data.data.access_token;
      tokenStore.setAccess(newAccess);
      flushSubscribers(newAccess);
      original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newAccess}` };
      return api(original);
    } catch (e) {
      flushSubscribers(null);
      tokenStore.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
  );
}

// --- helpers --------------------------------------------------------------
export async function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await p;
  if (!data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data.data;
}

export const API_BASE_URL = API_BASE;
export const API_V1_URL = API_V1;
