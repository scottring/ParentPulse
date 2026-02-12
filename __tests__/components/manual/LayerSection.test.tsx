import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { LayerSection } from '@/components/manual/LayerSection';
import { createMockLayers } from '../../setup/mocks/fixtures/manual';
import { emptyLayers } from '@/types/manual';

describe('LayerSection', () => {
  const mockLayers = createMockLayers();

  it('renders the layer name and description', () => {
    render(
      <LayerSection
        layerId="mind"
        data={mockLayers.mind}
        isExpanded={false}
      />
    );

    expect(screen.getByText('Mind')).toBeDefined();
  });

  it('shows "Empty" badge when layer has no data', () => {
    render(
      <LayerSection
        layerId="mind"
        data={emptyLayers.mind}
        isExpanded={false}
      />
    );

    expect(screen.getByText('Empty')).toBeDefined();
  });

  it('shows content when expanded', () => {
    render(
      <LayerSection
        layerId="mind"
        data={mockLayers.mind}
        isExpanded={true}
      />
    );

    expect(screen.getAllByText('Curiosity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kindness').length).toBeGreaterThan(0);
  });

  it('hides content when collapsed', () => {
    render(
      <LayerSection
        layerId="mind"
        data={mockLayers.mind}
        isExpanded={false}
      />
    );

    expect(screen.queryByText('Curiosity')).toBeNull();
  });

  it('calls onToggle when header is clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <LayerSection
        layerId="mind"
        data={mockLayers.mind}
        isExpanded={false}
        onToggle={onToggle}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders context layer with boundaries', () => {
    render(
      <LayerSection
        layerId="context"
        data={mockLayers.context}
        isExpanded={true}
      />
    );

    expect(screen.getByText('No screens during meals')).toBeDefined();
    expect(screen.getByText('immovable')).toBeDefined();
  });

  it('renders execution layer with rhythms', () => {
    render(
      <LayerSection
        layerId="execution"
        data={mockLayers.execution}
        isExpanded={true}
      />
    );

    expect(screen.getByText('Morning routine')).toBeDefined();
    expect(screen.getByText('Pizza Friday')).toBeDefined();
  });

  it('renders output layer with coherence indicators', () => {
    render(
      <LayerSection
        layerId="output"
        data={mockLayers.output}
        isExpanded={true}
      />
    );

    expect(screen.getByText('Everyone is laughing at dinner')).toBeDefined();
  });
});
