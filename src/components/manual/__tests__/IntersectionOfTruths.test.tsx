import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('IntersectionOfTruths', () => {
  const insight = {
    headline: 'The Silence Gap',
    narrative: "There is a 40% divergence between Evelyn's perceived stoicism and the emotional labor recorded in her private journals.",
    alignments: ['Both Evelyn and her children value Legacy as the primary motivation.'],
    divergences: ['Evelyn views her privacy as Protection; her children view it as Exclusion.'],
  };

  it('renders headline, narrative, and both columns', async () => {
    const { IntersectionOfTruths } = await import('@/components/manual/IntersectionOfTruths');
    render(<IntersectionOfTruths insight={insight} />);
    expect(screen.getByText(/The Silence Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/40% divergence/i)).toBeInTheDocument();
    expect(screen.getByText(/Legacy as the primary motivation/i)).toBeInTheDocument();
    expect(screen.getByText(/Protection.*Exclusion/i)).toBeInTheDocument();
  });

  it('renders nothing when no insight is provided', async () => {
    const { IntersectionOfTruths } = await import('@/components/manual/IntersectionOfTruths');
    const { container } = render(<IntersectionOfTruths insight={null} />);
    expect(container.firstChild).toBeNull();
  });
});
