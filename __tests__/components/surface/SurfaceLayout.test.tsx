import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { SurfaceLayout } from '@/components/surface/SurfaceLayout';

describe('SurfaceLayout', () => {
  it('renders hero and grid slots', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div data-testid="hero-content">Hero</div>}
        grid={<div data-testid="grid-content">Grid</div>}
        gridTileCount={3}
      />
    );

    expect(container.querySelector('[data-testid="hero-content"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="grid-content"]')).toBeInTheDocument();
  });

  it('has class "full-width" when gridTileCount is 0', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={0}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout');
    expect(layoutDiv).toHaveClass('full-width');
  });

  it('has class "wide-hero" when gridTileCount is 1', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={1}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout');
    expect(layoutDiv).toHaveClass('wide-hero');
  });

  it('has class "wide-hero" when gridTileCount is 2', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={2}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout');
    expect(layoutDiv).toHaveClass('wide-hero');
  });

  it('has class "standard" when gridTileCount is 3', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={3}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout');
    expect(layoutDiv).toHaveClass('standard');
  });

  it('has class "standard" when gridTileCount is greater than 3', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={5}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout');
    expect(layoutDiv).toHaveClass('standard');
  });

  it('renders grid only when provided', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div data-testid="hero-content">Hero</div>}
        grid={null}
        gridTileCount={0}
      />
    );

    expect(container.querySelector('[data-testid="hero-content"]')).toBeInTheDocument();
    expect(container.querySelector('.surface-grid')).not.toBeInTheDocument();
  });

  it('applies correct grid-template-columns for full-width', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={0}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout') as HTMLElement;
    expect(layoutDiv.style.gridTemplateColumns).toBe('1fr');
  });

  it('applies correct grid-template-columns for wide-hero', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={1}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout') as HTMLElement;
    expect(layoutDiv.style.gridTemplateColumns).toBe('60% 1fr');
  });

  it('applies correct grid-template-columns for standard', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={3}
      />
    );

    const layoutDiv = container.querySelector('.surface-layout') as HTMLElement;
    expect(layoutDiv.style.gridTemplateColumns).toBe('40% 1fr');
  });

  it('has overflow-y-auto on surface-grid', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={3}
      />
    );

    const gridDiv = container.querySelector('.surface-grid');
    expect(gridDiv).toHaveClass('overflow-y-auto');
  });
});
