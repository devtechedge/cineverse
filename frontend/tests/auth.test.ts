import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { tokenStore } from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      post: vi.fn(),
      get: vi.fn(),
    },
    unwrap: async (p: Promise<{ data: { data: unknown } }>) => (await p).data.data,
  };
});

import { api } from '@/lib/api';

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

describe('auth store', () => {
  beforeEach(() => {
    tokenStore.clear();
    useAuthStore.setState({ user: null, tokens: null, isLoading: false, error: null });
    mockedApi.post.mockReset();
    mockedApi.get.mockReset();
  });

  it('logs in and fetches the current user', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { access_token: 'a', refresh_token: 'r', token_type: 'bearer', expires_in: 1800 } },
    });
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { id: 1, email: 'a@b.c', full_name: null, is_active: true, role: 'user', created_at: '2025-01-01T00:00:00Z' } },
    });

    await useAuthStore.getState().login('a@b.c', 'pw12345678');
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('a@b.c');
    expect(tokenStore.access).toBe('a');
  });

  it('clears state on logout', async () => {
    useAuthStore.setState({
      user: { id: 1, email: 'x', full_name: null, is_active: true, role: 'user', created_at: '' },
      tokens: { access_token: 'a', refresh_token: 'r' },
    });
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: { logged_out: true } } });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(tokenStore.access).toBeNull();
  });
});
