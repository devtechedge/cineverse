/**
 * Mock data for the Vercel demo. Activated when NEXT_PUBLIC_MOCK_MODE=true.
 *
 * Strategy for reliability:
 * - Video streams use Mux's public test asset + Google's sample bucket.
 *   Both serve `video/mp4` with proper CORS + Accept-Ranges headers.
 * - Thumbnails are inline data: URIs (SVG) so they NEVER 404 even if upstream
 *   image hosts rate-limit a Vercel edge region.
 */
import type { Video, JournalEntry, Clip, User } from '@/types';

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export const MOCK_USER: User = {
  id: 1,
  email: 'demo@cineverse.app',
  full_name: 'Demo Director',
  is_active: true,
  role: 'user',
  created_at: '2026-01-15T10:00:00Z',
};

/** Build an inline SVG thumbnail (no external network req). */
function svgThumbnail(label: string, color1: string, color2: string, accent = '#e50914'): string {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'>
  <defs>
    <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='${color1}'/>
      <stop offset='100%' stop-color='${color2}'/>
    </linearGradient>
    <radialGradient id='glow' cx='50%' cy='50%' r='50%'>
      <stop offset='0%' stop-color='${accent}' stop-opacity='0.4'/>
      <stop offset='100%' stop-color='${accent}' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='640' height='360' fill='url(#g)'/>
  <circle cx='320' cy='180' r='180' fill='url(#glow)'/>
  <polygon points='295,140 295,220 365,180' fill='${accent}' opacity='0.95'/>
  <text x='320' y='320' font-family='Inter, sans-serif' font-size='22' font-weight='600' fill='white' text-anchor='middle' opacity='0.85'>${safe}</text>
</svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Reliable, CORS-friendly sample MP4s (short, ~1-2MB each, play instantly).
const SAMPLES = {
  big:    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  elephant:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  blazes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  sintel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  tears:  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  subaru: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  joyrides:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
};

export const MOCK_VIDEOS: Video[] = [
  {
    id: 1, user_id: 1,
    title: 'Big Buck Bunny',
    description: 'A short animated film by the Blender Foundation. The first project I uploaded to test my cineverse — turns out animation holds up beautifully at any resolution.',
    status: 'ready', duration: 596, resolution: '1920x1080',
    thumbnail_url: svgThumbnail('Big Buck Bunny', '#1a4d2e', '#0a2818'),
    stream_url: SAMPLES.big,
    tags: ['animation', 'blender', 'classics'],
    created_at: '2026-06-20T14:30:00Z',
  },
  {
    id: 2, user_id: 1,
    title: 'Elephant Dream',
    description: 'Surreal short by the Blender Institute. Watching this on my own platform feels different — owning the playback experience changes how you see the cuts.',
    status: 'ready', duration: 653, resolution: '1920x1080',
    thumbnail_url: svgThumbnail('Elephant Dream', '#3d2952', '#1a0f2e'),
    stream_url: SAMPLES.elephant,
    tags: ['animation', 'surreal', 'short-film'],
    created_at: '2026-06-18T09:15:00Z',
  },
  {
    id: 3, user_id: 1,
    title: 'For Bigger Blazes',
    description: 'Test footage from a Chromecast launch reel. Kept it because the color grading is wild — fire footage as a screensaver.',
    status: 'ready', duration: 15, resolution: '1920x1080',
    thumbnail_url: svgThumbnail('For Bigger Blazes', '#7a1f1f', '#2e0808', '#ff8800'),
    stream_url: SAMPLES.blazes,
    tags: ['reel', 'color', 'test-footage'],
    created_at: '2026-06-15T18:00:00Z',
  },
  {
    id: 4, user_id: 1,
    title: 'Sintel — Trailer',
    description: 'Trailer for Sintel, another Blender Foundation feature. Saved here as a reference cut for my own edits.',
    status: 'ready', duration: 52, resolution: '1920x1080',
    thumbnail_url: svgThumbnail('Sintel — Trailer', '#3a5a8c', '#0f1f3a'),
    stream_url: SAMPLES.sintel,
    tags: ['animation', 'trailer', 'reference'],
    created_at: '2026-06-12T11:45:00Z',
  },
  {
    id: 5, user_id: 1,
    title: 'Tears of Steel',
    description: 'Sci-fi short, Blender Foundation. The VFX-to-practical ratio in this is something I keep coming back to.',
    status: 'ready', duration: 734, resolution: '1920x1080',
    thumbnail_url: svgThumbnail('Tears of Steel', '#5c5c6e', '#1f1f28', '#3aa0ff'),
    stream_url: SAMPLES.tears,
    tags: ['sci-fi', 'vfx', 'short-film'],
    created_at: '2026-06-08T20:20:00Z',
  },
  {
    id: 6, user_id: 1,
    title: 'Subaru Outback On Street And Dirt',
    description: 'B-roll archive from a road trip last summer. The drone shots at 4:21 still give me chills.',
    status: 'ready', duration: 594, resolution: '1920x1080',
    thumbnail_url: svgThumbnail('Subaru Outback', '#6b4423', '#2a1a0d', '#ffaa44'),
    stream_url: SAMPLES.subaru,
    tags: ['travel', 'b-roll', 'drone'],
    created_at: '2026-06-01T08:00:00Z',
  },
];

export const MOCK_JOURNAL: Record<number, JournalEntry[]> = {
  1: [
    { id: 101, video_id: 1, user_id: 1, timestamp_seconds: 12.5,
      content_text: 'The opening sequence — that slow zoom on the meadow always reminds me why I love long establishing shots.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-20T15:00:00Z', updated_at: '2026-06-20T15:00:00Z' },
    { id: 102, video_id: 1, user_id: 1, timestamp_seconds: 145.2,
      content_text: "Buck's first encounter with the bullies. The pacing here is masterful — note how the cut to the butterfly is the emotional pivot.",
      content: { type: 'doc', content: [] },
      created_at: '2026-06-20T15:08:00Z', updated_at: '2026-06-20T15:08:00Z' },
    { id: 103, video_id: 1, user_id: 1, timestamp_seconds: 432.0,
      content_text: 'The trap sequence. Every frame is choreographed like a Buster Keaton bit.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-20T15:20:00Z', updated_at: '2026-06-20T15:20:00Z' },
  ],
  2: [
    { id: 201, video_id: 2, user_id: 1, timestamp_seconds: 88.0,
      content_text: 'The cityscape reveal — first time I noticed the texture work on the buildings. Subtle but everywhere.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-18T10:00:00Z', updated_at: '2026-06-18T10:00:00Z' },
    { id: 202, video_id: 2, user_id: 1, timestamp_seconds: 320.5,
      content_text: 'Proog and Emo argument. The dialogue is sparse but the body language carries every beat.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-18T10:15:00Z', updated_at: '2026-06-18T10:15:00Z' },
  ],
  5: [
    { id: 501, video_id: 5, user_id: 1, timestamp_seconds: 60.0,
      content_text: 'The opening rooftop sequence. Practical lighting + CG augmentation done right.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-08T21:00:00Z', updated_at: '2026-06-08T21:00:00Z' },
  ],
  6: [
    { id: 601, video_id: 6, user_id: 1, timestamp_seconds: 261.0,
      content_text: 'The drone shot over the ridge. We almost lost the drone here — worth it.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-01T09:30:00Z', updated_at: '2026-06-01T09:30:00Z' },
  ],
};

export const MOCK_CLIPS: Clip[] = [
  {
    id: 1, video_id: 1, user_id: 1,
    title: 'The butterfly moment',
    start_time: 140, end_time: 168,
    clip_url: SAMPLES.big,
    created_at: '2026-06-20T16:00:00Z',
  },
];

/** New uploads get a placeholder + a working sample MP4. */
export const newUploadDefaults = {
  thumbnail_url: svgThumbnail('Just uploaded', '#1f3a5c', '#0a1a2e'),
  stream_url: SAMPLES.joyrides,
};

export const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
