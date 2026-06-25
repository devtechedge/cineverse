'use client';
import { create } from 'zustand';
import { api, unwrap, API_BASE_URL } from '@/lib/api';
import { MOCK_MODE } from '@/lib/mock-data';

export type UploadStatus = 'queued' | 'uploading' | 'assembling' | 'processing' | 'ready' | 'failed';

export interface UploadItem {
  id: string;            // local UUID
  file: File;
  title: string;
  description?: string;
  tags: string[];
  upload_id?: string;    // server-assigned
  video_id?: number;
  status: UploadStatus;
  progress: number;      // 0–100
  message?: string;
}

interface UploadState {
  items: Record<string, UploadItem>;
  enqueue: (file: File, meta: { title: string; description?: string; tags: string[] }) => string;
  remove: (id: string) => void;
  patch: (id: string, partial: Partial<UploadItem>) => void;
  startUpload: (id: string) => Promise<void>;
}

const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MiB

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useUploadStore = create<UploadState>((set, get) => ({
  items: {},

  enqueue(file, meta) {
    const id = uuid();
    set((s) => ({
      items: {
        ...s.items,
        [id]: {
          id,
          file,
          title: meta.title,
          description: meta.description,
          tags: meta.tags,
          status: 'queued',
          progress: 0,
        },
      },
    }));
    return id;
  },

  remove(id) {
    set((s) => {
      const next = { ...s.items };
      delete next[id];
      return { items: next };
    });
  },

  patch(id, partial) {
    set((s) => {
      const item = s.items[id];
      if (!item) return s;
      return { items: { ...s.items, [id]: { ...item, ...partial } } };
    });
  },

  async startUpload(id) {
    const item = get().items[id];
    if (!item) return;

    // --- demo mode: simulate a realistic upload + processing cycle ---
    if (MOCK_MODE) {
      get().patch(id, { status: 'uploading', progress: 0 });
      for (let pct = 5; pct <= 90; pct += 5) {
        await new Promise((r) => setTimeout(r, 120));
        get().patch(id, { progress: pct });
      }
      get().patch(id, { status: 'processing', progress: 95, message: 'Transcoding (simulated)' });
      await new Promise((r) => setTimeout(r, 800));
      try {
        const fin = await unwrap<{ video_id: number; status: string }>(
          api.post(`/videos/finalize/mock`, {
            title: item.title,
            description: item.description,
            tags: item.tags,
          }),
        );
        get().patch(id, { video_id: fin.video_id, status: 'ready', progress: 100, message: 'Done (demo)' });
      } catch (e) {
        get().patch(id, { status: 'failed', message: e instanceof Error ? e.message : 'Failed' });
      }
      return;
    }

    try {
      // 1. init
      const init = await unwrap<{ upload_id: string; chunk_size: number; expires_in: number }>(
        api.post('/videos/init', {
          filename: item.file.name,
          size_bytes: item.file.size,
          title: item.title,
          description: item.description,
          tags: item.tags,
        }),
      );
      get().patch(id, { upload_id: init.upload_id, status: 'uploading' });

      // 2. open WS for progress (server is authoritative; we also derive locally)
      const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL || API_BASE_URL.replace(/^http/, 'ws') || '';
      const ws = wsBase ? new WebSocket(`${wsBase}/api/v1/ws/upload/${init.upload_id}`) : null;
      if (ws) {
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.stage) {
              get().patch(id, {
                status: msg.stage as UploadStatus,
                progress: Math.max(get().items[id]?.progress ?? 0, msg.pct ?? 0),
                message: msg.message ?? undefined,
              });
            }
          } catch { /* ignore */ }
        };
      }

      // 3. chunked upload (sequential with retry)
      const chunkSize = init.chunk_size || CHUNK_SIZE;
      const total = Math.ceil(item.file.size / chunkSize);
      for (let i = 0; i < total; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, item.file.size);
        const blob = item.file.slice(start, end);
        const form = new FormData();
        form.append('chunk_index', String(i));
        form.append('chunk', new Blob([blob]), `chunk_${i}`);

        let attempts = 0;
        // up to 3 retries with backoff
        while (true) {
          try {
            await api.post(`/videos/chunk/${init.upload_id}`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            break;
          } catch (err) {
            attempts++;
            if (attempts >= 3) throw err;
            await new Promise((r) => setTimeout(r, 500 * attempts));
          }
        }
        const pct = ((i + 1) / total) * 100 * 0.95; // reserve 5% for finalize/process
        get().patch(id, { progress: Math.max(get().items[id]?.progress ?? 0, pct) });
      }

      // 4. finalize
      const fin = await unwrap<{ video_id: number; status: string }>(
        api.post(`/videos/finalize/${init.upload_id}`),
      );
      get().patch(id, { video_id: fin.video_id, status: 'processing', progress: 95 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      get().patch(id, { status: 'failed', message: msg });
    }
  },
}));
