import type { LayerId } from '@/types/assessment';

/**
 * Calculate hexagon points for spider diagram
 * Returns 6 points arranged in a hexagon, starting from top (12 o'clock)
 */
export function calculateHexagonPoints(
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number; layerId: LayerId }[] {
  const points: { x: number; y: number; layerId: LayerId }[] = [];

  for (let i = 0; i < 6; i++) {
    // Start from -90 degrees (12 o'clock) and go clockwise
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push({ x, y, layerId: (i + 1) as LayerId });
  }

  return points;
}

/**
 * Calculate the points for a data polygon based on scores
 * @param scores - Array of 6 scores (1-10) for each layer
 * @param centerX - Center X of the diagram
 * @param centerY - Center Y of the diagram
 * @param maxRadius - Maximum radius (for score of 10)
 */
export function calculateDataPoints(
  scores: number[],
  centerX: number,
  centerY: number,
  maxRadius: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    // Scale score (1-10) to radius (0-maxRadius)
    const score = scores[i] || 0;
    const normalizedScore = Math.max(0, Math.min(10, score)) / 10;
    const radius = normalizedScore * maxRadius;

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push({ x, y });
  }

  return points;
}

/**
 * Convert points array to SVG polygon points string
 */
export function pointsToSvgString(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * Calculate position for a label at a given layer
 * Places labels outside the hexagon with some padding
 */
export function calculateLabelPosition(
  layerIndex: number,
  centerX: number,
  centerY: number,
  radius: number,
  padding: number = 20
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const angle = (Math.PI / 3) * layerIndex - Math.PI / 2;
  const x = centerX + (radius + padding) * Math.cos(angle);
  const y = centerY + (radius + padding) * Math.sin(angle);

  // Determine text anchor based on position
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  if (x < centerX - 10) anchor = 'end';
  else if (x > centerX + 10) anchor = 'start';

  return { x, y, anchor };
}

/**
 * Generate grid circles for the spider diagram background
 */
export function generateGridCircles(
  centerX: number,
  centerY: number,
  maxRadius: number,
  steps: number = 5
): { radius: number; value: number }[] {
  const circles: { radius: number; value: number }[] = [];

  for (let i = 1; i <= steps; i++) {
    const value = (10 / steps) * i;
    const radius = (maxRadius / steps) * i;
    circles.push({ radius, value });
  }

  return circles;
}

/**
 * Calculate the area of a polygon (for comparison metrics)
 */
export function calculatePolygonArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate percentage change between two score sets
 */
export function calculateProgressPercentage(
  baseline: number[],
  current: number[]
): number {
  const baselineTotal = baseline.reduce((a, b) => a + b, 0);
  const currentTotal = current.reduce((a, b) => a + b, 0);

  if (baselineTotal === 0) return 0;

  return ((currentTotal - baselineTotal) / baselineTotal) * 100;
}
