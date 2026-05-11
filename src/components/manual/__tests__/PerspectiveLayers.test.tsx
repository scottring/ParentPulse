import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('PerspectiveLayers', () => {
  const perspectives = [
    { id: 'self', label: 'Self View', pullQuote: '"I am the silent glue..."', tint: 'rose' as const },
    { id: 'author', label: 'Author Observation', pullQuote: '"Evelyn maintains a rigorous schedule..."', tint: 'sage' as const },
    { id: 'children', label: "The Children's Lens", pullQuote: '"Mom is always fine."', tint: 'azure' as const },
  ];

  it('renders one card per perspective with its label and pull quote', async () => {
    const { PerspectiveLayers } = await import('@/components/manual/PerspectiveLayers');
    render(<PerspectiveLayers perspectives={perspectives} />);
    expect(screen.getByText(/Self View/i)).toBeInTheDocument();
    expect(screen.getByText(/silent glue/i)).toBeInTheDocument();
    expect(screen.getByText(/Author Observation/i)).toBeInTheDocument();
    expect(screen.getByText(/Children's Lens/i)).toBeInTheDocument();
  });

  it('renders nothing when perspectives is empty', async () => {
    const { PerspectiveLayers } = await import('@/components/manual/PerspectiveLayers');
    const { container } = render(<PerspectiveLayers perspectives={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
