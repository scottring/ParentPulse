import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/transcribeClient', () => ({
  transcribeBlob: vi.fn(),
}));

const startMock = vi.fn();
const stopMock = vi.fn();
const resetMock = vi.fn();
const hookState = {
  state: 'idle' as 'idle' | 'recording' | 'transcribing' | 'error' | 'requesting-permission',
  error: null as null | { kind: string; message: string },
  elapsedSec: 0,
  start: startMock,
  stop: stopMock,
  reset: resetMock,
};

vi.mock('@/hooks/useAudioRecording', () => ({
  useAudioRecording: () => hookState,
}));

import { MicButton } from '@/components/voice/MicButton';
import { transcribeBlob } from '@/lib/transcribeClient';

beforeEach(() => {
  vi.clearAllMocks();
  hookState.state = 'idle';
  hookState.error = null;
  hookState.elapsedSec = 0;
});

describe('MicButton', () => {
  it('renders an idle mic button with aria-label', () => {
    render(<MicButton onTranscript={() => {}} />);
    expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument();
  });

  it('starts recording on click', () => {
    render(<MicButton onTranscript={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(startMock).toHaveBeenCalled();
  });

  it('on stop, transcribes the blob and calls onTranscript with the text', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    stopMock.mockResolvedValue(blob);
    (transcribeBlob as ReturnType<typeof vi.fn>).mockResolvedValue('hi there');
    hookState.state = 'recording';
    hookState.elapsedSec = 4;

    const onTranscript = vi.fn();
    render(<MicButton onTranscript={onTranscript} />);
    fireEvent.click(screen.getByRole('button', { name: /recording/i }));

    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hi there'));
    expect(transcribeBlob).toHaveBeenCalledWith(blob, 4);
  });

  it('shows error message when transcription returns empty', async () => {
    stopMock.mockResolvedValue(new Blob(['x'], { type: 'audio/webm' }));
    (transcribeBlob as ReturnType<typeof vi.fn>).mockResolvedValue('   ');
    hookState.state = 'recording';

    render(<MicButton onTranscript={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(screen.getByText(/no speech detected/i)).toBeInTheDocument(),
    );
  });

  it('clicking the button while in error state clears the error and does not start recording', async () => {
    stopMock.mockResolvedValue(new Blob(['x'], { type: 'audio/webm' }));
    (transcribeBlob as ReturnType<typeof vi.fn>).mockResolvedValue('');
    hookState.state = 'recording';

    render(<MicButton onTranscript={() => {}} />);
    // First click stops recording, transcribes empty → error shown
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByText(/no speech detected/i)).toBeInTheDocument(),
    );

    // Reset state to simulate hook being idle again with the post-error active
    hookState.state = 'idle';
    startMock.mockClear();
    resetMock.mockClear();

    // Second click in error state should reset, NOT call start()
    fireEvent.click(screen.getByRole('button'));
    expect(resetMock).toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });
});
