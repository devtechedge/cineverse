export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  role: string;
  created_at: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Video {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: VideoStatus;
  duration: number | null;
  resolution: string | null;
  thumbnail_url: string | null;
  stream_url: string | null;
  tags: string[];
  created_at: string;
}

export interface JournalEntry {
  id: number;
  video_id: number;
  user_id: number;
  timestamp_seconds: number;
  content: Record<string, unknown>;
  content_text: string;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: number;
  video_id: number;
  user_id: number;
  title: string;
  start_time: number;
  end_time: number;
  clip_url: string | null;
  created_at: string;
}

export interface ShareToken {
  token: string;
  url: string;
  expires_at: string | null;
  view_count: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; page_size: number; pages: number };
  error: null;
}

export interface UploadProgressMessage {
  upload_id: string;
  stage: 'uploading' | 'assembling' | 'processing' | 'ready' | 'failed';
  pct: number;
  bytes_received?: number;
  message?: string | null;
}
