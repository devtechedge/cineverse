/**
 * In-memory mock of the FastAPI surface area.
 *
 * Mirrors the response envelope of the real API so React Query, the auth store,
 * the upload store, and every component work identically in mock mode.
 */
import {
  MOCK_USER,
  MOCK_VIDEOS,
  MOCK_JOURNAL,
  MOCK_CLIPS,
  delay,
} from './mock-data';
import type {
  Video,
  JournalEntry,
  Clip,
  User,
  Tokens,
  ShareToken,
  ApiResponse,
  PaginatedApiResponse,
} from '@/types';

// ---- in-memory mutable state --------------------------------------------- //
const videos: Video[] = [...MOCK_VIDEOS];
const journal: Record<number, JournalEntry[]> = JSON.parse(JSON.stringify(MOCK_JOURNAL));
const clips: Clip[] = [...MOCK_CLIPS];
const shares: Record<string, ShareToken & { video_id?: number; clip_id?: number }> = {};
let nextId = 1000;

function ok<T>(data: T): { data: ApiResponse<T> } {
  return { data: { success: true, data, error: null } };
}

function paginated<T>(items: T[], page: number, page_size: number): { data: PaginatedApiResponse<T> } {
  const start = (page - 1) * page_size;
  const slice = items.slice(start, start + page_size);
  return {
    data: {
      success: true,
      data: slice,
      meta: {
        total: items.length,
        page,
        page_size,
        pages: Math.max(1, Math.ceil(items.length / page_size)),
      },
      error: null,
    },
  };
}

// ---- query-string helpers ------------------------------------------------ //
function parseQuery(url: string): URLSearchParams {
  const q = url.includes('?') ? url.split('?')[1] : '';
  return new URLSearchParams(q ?? '');
}

// ---- router ------------------------------------------------------------- //
export async function mockGet(url: string): Promise<{ data: ApiResponse<unknown> | PaginatedApiResponse<unknown> }> {
  await delay(180);
  const path = url.split('?')[0]!;

  if (path === '/auth/me') return ok(MOCK_USER) as never;

  if (path === '/videos') {
    const qp = parseQuery(url);
    const page = Number(qp.get('page') ?? '1');
    const page_size = Number(qp.get('page_size') ?? '24');
    const search = (qp.get('search') ?? '').toLowerCase();
    const tag = (qp.get('tag') ?? '').toLowerCase();
    const status = qp.get('status');
    const has_journal = qp.get('has_journal');
    const sort = qp.get('sort') ?? 'created_desc';

    let list = [...videos];
    if (search) list = list.filter((v) => v.title.toLowerCase().includes(search));
    if (tag) list = list.filter((v) => v.tags.includes(tag));
    if (status) list = list.filter((v) => v.status === status);
    if (has_journal === 'true') list = list.filter((v) => (journal[v.id]?.length ?? 0) > 0);
    if (has_journal === 'false') list = list.filter((v) => !journal[v.id]?.length);

    if (sort === 'created_asc') {
      list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    } else if (sort === 'title_asc') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    return paginated(list, page, page_size) as never;
  }

  const videoDetail = path.match(/^\/videos\/(\d+)$/);
  if (videoDetail) {
    const id = Number(videoDetail[1]);
    const v = videos.find((x) => x.id === id);
    if (!v) return errResp('NOT_FOUND', 'Video not found');
    return ok(v) as never;
  }

  const journalList = path.match(/^\/videos\/(\d+)\/journal$/);
  if (journalList) {
    const id = Number(journalList[1]);
    return ok(journal[id] ?? []) as never;
  }

  if (path === '/journal/search') {
    const qp = parseQuery(url);
    const q = (qp.get('q') ?? '').toLowerCase();
    const hits: Array<{ id: number; video_id: number; timestamp_seconds: number; snippet: string; created_at: string }> = [];
    for (const arr of Object.values(journal)) {
      for (const e of arr) {
        if (e.content_text.toLowerCase().includes(q)) {
          hits.push({
            id: e.id,
            video_id: e.video_id,
            timestamp_seconds: e.timestamp_seconds,
            snippet: e.content_text.slice(0, 160),
            created_at: e.created_at,
          });
        }
      }
    }
    return ok(hits) as never;
  }

  const clipDetail = path.match(/^\/clips\/(\d+)$/);
  if (clipDetail) {
    const id = Number(clipDetail[1]);
    const c = clips.find((x) => x.id === id);
    if (!c) return errResp('NOT_FOUND', 'Clip not found');
    return ok(c) as never;
  }

  const shareGet = path.match(/^\/share\/([^/]+)$/);
  if (shareGet) {
    const tk = shareGet[1]!;
    const rec = shares[tk];
    if (!rec) return errResp('NOT_FOUND', 'Invalid share token');
    rec.view_count += 1;
    if (rec.clip_id) {
      const c = clips.find((x) => x.id === rec.clip_id);
      if (!c) return errResp('NOT_FOUND', 'Clip missing');
      return ok({
        kind: 'clip',
        title: c.title,
        stream_url: c.clip_url ?? '',
        duration: c.end_time - c.start_time,
        view_count: rec.view_count,
      }) as never;
    }
    if (rec.video_id) {
      const v = videos.find((x) => x.id === rec.video_id);
      if (!v) return errResp('NOT_FOUND', 'Video missing');
      return ok({
        kind: 'video',
        title: v.title,
        stream_url: v.stream_url ?? '',
        duration: v.duration,
        view_count: rec.view_count,
      }) as never;
    }
  }

  return errResp('NOT_FOUND', `Mock: no handler for GET ${path}`);
}

export async function mockPost(url: string, body: unknown): Promise<{ data: ApiResponse<unknown> }> {
  await delay(250);
  const path = url.split('?')[0]!;

  if (path === '/auth/login' || path === '/auth/register') {
    const tokens: Tokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
    };
    return ok(tokens) as never;
  }
  if (path === '/auth/refresh') {
    return ok({ access_token: 'mock-access-token', token_type: 'bearer', expires_in: 3600 }) as never;
  }
  if (path === '/auth/logout') return ok({ logged_out: true }) as never;

  if (path === '/videos/init') {
    return {
      data: {
        success: true,
        data: {
          upload_id: `mock-${nextId++}`,
          chunk_size: 1024 * 1024,
          expires_in: 3600,
        },
        error: null,
      },
    } as never;
  }

  const chunkMatch = path.match(/^\/videos\/chunk\/.+$/);
  if (chunkMatch) {
    return ok({ stage: 'uploading', pct: 50 }) as never;
  }

  const finalizeMatch = path.match(/^\/videos\/finalize\/(.+)$/);
  if (finalizeMatch) {
    const b = (body ?? {}) as { title?: string; tags?: string[]; description?: string };
    const id = nextId++;
    const newVideo: Video = {
      id,
      user_id: 1,
      title: b.title || 'Untitled upload',
      description: b.description ?? 'Uploaded in demo mode — no real file was processed.',
      status: 'ready',
      duration: 30,
      resolution: '1920x1080',
      thumbnail_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
      stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      tags: b.tags ?? [],
      created_at: new Date().toISOString(),
    };
    videos.unshift(newVideo);
    return ok({ video_id: id, status: 'ready' }) as never;
  }

  const journalCreate = path.match(/^\/videos\/(\d+)\/journal$/);
  if (journalCreate) {
    const vid = Number(journalCreate[1]);
    const b = body as { timestamp_seconds: number; content: Record<string, unknown>; content_text: string };
    const entry: JournalEntry = {
      id: nextId++,
      video_id: vid,
      user_id: 1,
      timestamp_seconds: b.timestamp_seconds,
      content: b.content,
      content_text: b.content_text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    (journal[vid] ||= []).push(entry);
    journal[vid]!.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    return ok(entry) as never;
  }

  const clipCreate = path.match(/^\/videos\/(\d+)\/clips$/);
  if (clipCreate) {
    const vid = Number(clipCreate[1]);
    const b = body as { title: string; start_time: number; end_time: number };
    const src = videos.find((v) => v.id === vid)?.stream_url ?? '';
    const c: Clip = {
      id: nextId++,
      video_id: vid,
      user_id: 1,
      title: b.title,
      start_time: b.start_time,
      end_time: b.end_time,
      clip_url: src,
      created_at: new Date().toISOString(),
    };
    clips.push(c);
    return ok(c) as never;
  }

  const shareVid = path.match(/^\/videos\/(\d+)\/share$/);
  const shareClip = path.match(/^\/clips\/(\d+)\/share$/);
  if (shareVid || shareClip) {
    const token = `demo-${Math.random().toString(36).slice(2, 14)}`;
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/share/${token}`
        : `/share/${token}`;
    const rec = {
      token,
      url,
      expires_at: expires,
      view_count: 0,
      video_id: shareVid ? Number(shareVid[1]) : undefined,
      clip_id: shareClip ? Number(shareClip[1]) : undefined,
    };
    shares[token] = rec;
    return ok({ token, url, expires_at: expires, view_count: 0 }) as never;
  }

  return errResp('NOT_FOUND', `Mock: no handler for POST ${path}`);
}

export async function mockPut(url: string, body: unknown): Promise<{ data: ApiResponse<unknown> }> {
  await delay(200);
  const m = url.match(/^\/journal\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    for (const arr of Object.values(journal)) {
      const e = arr.find((x) => x.id === id);
      if (e) {
        const b = body as Partial<JournalEntry>;
        Object.assign(e, b, { updated_at: new Date().toISOString() });
        return ok(e) as never;
      }
    }
  }
  return errResp('NOT_FOUND', `Mock: no handler for PUT ${url}`);
}

export async function mockDelete(url: string): Promise<{ data: ApiResponse<unknown> }> {
  await delay(200);
  const vidM = url.match(/^\/videos\/(\d+)$/);
  if (vidM) {
    const id = Number(vidM[1]);
    const idx = videos.findIndex((v) => v.id === id);
    if (idx >= 0) videos.splice(idx, 1);
    return ok({ deleted: true, id }) as never;
  }
  const journalM = url.match(/^\/journal\/(\d+)$/);
  if (journalM) {
    const id = Number(journalM[1]);
    for (const arr of Object.values(journal)) {
      const idx = arr.findIndex((e) => e.id === id);
      if (idx >= 0) arr.splice(idx, 1);
    }
    return ok({ deleted: true, id }) as never;
  }
  return errResp('NOT_FOUND', `Mock: no handler for DELETE ${url}`);
}

function errResp(code: string, message: string): { data: ApiResponse<never> } {
  return { data: { success: false, data: null, error: { code, message } } } as never;
}
