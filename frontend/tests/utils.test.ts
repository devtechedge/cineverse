import { describe, it, expect } from 'vitest';
import { formatDuration, formatBytes } from '@/lib/utils';

describe('formatDuration', () => {
  it('handles seconds < 1h', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
  });
  it('includes hours', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });
  it('coerces null', () => {
    expect(formatDuration(null)).toBe('00:00');
  });
});

describe('formatBytes', () => {
  it('formats KB/MB/GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(5 * 1024 ** 2)).toBe('5.0 MB');
  });
});
