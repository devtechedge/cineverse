/**
 * Mock data for the Vercel demo. Activated when NEXT_PUBLIC_MOCK_MODE=true.
 *
 * Uses public-domain sample videos hosted by Google's GTV-Videos-Bucket so we
 * never need our own storage. Thumbnails are from the same bucket.
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

// Public CC0 / sample videos — direct .mp4 URLs that support HTTP range requests.
const BUCKET = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

export const MOCK_VIDEOS: Video[] = [
  {
    id: 1,
    user_id: 1,
    title: 'Big Buck Bunny',
    description: 'A short animated film by the Blender Foundation. The first project I uploaded to test my cineverse — turns out animation holds up beautifully at any resolution.',
    status: 'ready',
    duration: 596,
    resolution: '1920x1080',
    thumbnail_url: `${BUCKET}/images/BigBuckBunny.jpg`,
    stream_url: `${BUCKET}/BigBuckBunny.mp4`,
    tags: ['animation', 'blender', 'classics'],
    created_at: '2026-06-20T14:30:00Z',
  },
  {
    id: 2,
    user_id: 1,
    title: 'Elephant Dream',
    description: 'Surreal short by the Blender Institute. Watching this on my own platform feels different — owning the playback experience changes how you see the cuts.',
    status: 'ready',
    duration: 653,
    resolution: '1920x1080',
    thumbnail_url: `${BUCKET}/images/ElephantsDream.jpg`,
    stream_url: `${BUCKET}/ElephantsDream.mp4`,
    tags: ['animation', 'surreal', 'short-film'],
    created_at: '2026-06-18T09:15:00Z',
  },
  {
    id: 3,
    user_id: 1,
    title: 'For Bigger Blazes',
    description: 'Test footage from a Chromecast launch reel. Kept it because the color grading is wild — fire footage as a screensaver.',
    status: 'ready',
    duration: 15,
    resolution: '1920x1080',
    thumbnail_url: `${BUCKET}/images/ForBiggerBlazes.jpg`,
    stream_url: `${BUCKET}/ForBiggerBlazes.mp4`,
    tags: ['reel', 'color', 'test-footage'],
    created_at: '2026-06-15T18:00:00Z',
  },
  {
    id: 4,
    user_id: 1,
    title: 'Sintel — Trailer',
    description: 'Trailer for Sintel, another Blender Foundation feature. Saved here as a reference cut for my own edits.',
    status: 'ready',
    duration: 52,
    resolution: '1920x1080',
    thumbnail_url: `${BUCKET}/images/Sintel.jpg`,
    stream_url: `${BUCKET}/Sintel.mp4`,
    tags: ['animation', 'trailer', 'reference'],
    created_at: '2026-06-12T11:45:00Z',
  },
  {
    id: 5,
    user_id: 1,
    title: 'Tears of Steel',
    description: 'Sci-fi short, Blender Foundation. The VFX-to-practical ratio in this is something I keep coming back to.',
    status: 'ready',
    duration: 734,
    resolution: '1920x1080',
    thumbnail_url: `${BUCKET}/images/TearsOfSteel.jpg`,
    stream_url: `${BUCKET}/TearsOfSteel.mp4`,
    tags: ['sci-fi', 'vfx', 'short-film'],
    created_at: '2026-06-08T20:20:00Z',
  },
  {
    id: 6,
    user_id: 1,
    title: 'Subaru Outback On Street And Dirt',
    description: 'B-roll archive from a road trip last summer. The drone shots at 4:21 still give me chills.',
    status: 'ready',
    duration: 594,
    resolution: '1920x1080',
    thumbnail_url: `${BUCKET}/images/SubaruOutbackOnStreetAndDirt.jpg`,
    stream_url: `${BUCKET}/SubaruOutbackOnStreetAndDirt.mp4`,
    tags: ['travel', 'b-roll', 'drone'],
    created_at: '2026-06-01T08:00:00Z',
  },
];

export const MOCK_JOURNAL: Record<number, JournalEntry[]> = {
  1: [
    {
      id: 101,
      video_id: 1,
      user_id: 1,
      timestamp_seconds: 12.5,
      content_text: 'The opening sequence — that slow zoom on the meadow always reminds me why I love long establishing shots.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-20T15:00:00Z',
      updated_at: '2026-06-20T15:00:00Z',
    },
    {
      id: 102,
      video_id: 1,
      user_id: 1,
      timestamp_seconds: 145.2,
      content_text: 'Buck\'s first encounter with the bullies. The pacing here is masterful — note how the cut to the butterfly is the emotional pivot.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-20T15:08:00Z',
      updated_at: '2026-06-20T15:08:00Z',
    },
    {
      id: 103,
      video_id: 1,
      user_id: 1,
      timestamp_seconds: 432.0,
      content_text: 'The trap sequence. Every frame is choreographed like a Buster Keaton bit.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-20T15:20:00Z',
      updated_at: '2026-06-20T15:20:00Z',
    },
  ],
  2: [
    {
      id: 201,
      video_id: 2,
      user_id: 1,
      timestamp_seconds: 88.0,
      content_text: 'The cityscape reveal — first time I noticed the texture work on the buildings. Subtle but everywhere.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-18T10:00:00Z',
      updated_at: '2026-06-18T10:00:00Z',
    },
    {
      id: 202,
      video_id: 2,
      user_id: 1,
      timestamp_seconds: 320.5,
      content_text: 'Proog and Emo argument. The dialogue is sparse but the body language carries every beat.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-18T10:15:00Z',
      updated_at: '2026-06-18T10:15:00Z',
    },
  ],
  5: [
    {
      id: 501,
      video_id: 5,
      user_id: 1,
      timestamp_seconds: 60.0,
      content_text: 'The opening rooftop sequence. Practical lighting + CG augmentation done right.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-08T21:00:00Z',
      updated_at: '2026-06-08T21:00:00Z',
    },
  ],
  6: [
    {
      id: 601,
      video_id: 6,
      user_id: 1,
      timestamp_seconds: 261.0,
      content_text: 'The drone shot over the ridge. We almost lost the drone here — worth it.',
      content: { type: 'doc', content: [] },
      created_at: '2026-06-01T09:30:00Z',
      updated_at: '2026-06-01T09:30:00Z',
    },
  ],
};

export const MOCK_CLIPS: Clip[] = [
  {
    id: 1,
    video_id: 1,
    user_id: 1,
    title: 'The butterfly moment',
    start_time: 140,
    end_time: 168,
    clip_url: `${BUCKET}/BigBuckBunny.mp4`,
    created_at: '2026-06-20T16:00:00Z',
  },
];

/** Simulated network latency so the UI shows its loading states authentically. */
export const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
