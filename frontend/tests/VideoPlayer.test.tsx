import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPlayer } from '@/components/VideoPlayer';

describe('VideoPlayer', () => {
  it('renders the play button label', () => {
    render(<VideoPlayer src="https://example.test/sample.mp4" />);
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
  });

  it('renders volume control', () => {
    render(<VideoPlayer src="https://example.test/sample.mp4" />);
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument();
  });
});
