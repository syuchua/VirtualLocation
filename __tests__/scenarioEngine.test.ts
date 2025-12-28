import { buildTimeline } from '@/services/scenarioEngine';
import type { Scenario } from '@/types/scenario';

const buildScenario = (): Scenario => ({
  id: 'test',
  name: '示例',
  createdAt: 0,
  updatedAt: 0,
  segments: [
    {
      id: 'seg-1',
      label: 'A',
      points: [
        [120.0, 30.0],
        [120.0009, 30.0003],
      ],
      pace: 6,
      dwellMs: 0,
      easing: 'linear',
    },
    {
      id: 'seg-2',
      label: 'B',
      points: [
        [120.0009, 30.0003],
        [120.0018, 30.0006],
      ],
      pace: 5,
      dwellMs: 5000,
      easing: 'easeInOut',
    },
  ],
});

describe('buildTimeline', () => {
  it('calculates summary metrics with dwell time', () => {
    const scenario = buildScenario();
    const result = buildTimeline(scenario, { startAtMs: 0 });

    expect(result.points.length).toBeGreaterThan(0);
    expect(result.summary.totalDistanceKm).toBeGreaterThan(0);
    // dwell adds to duration but not distance
    expect(result.summary.estimatedDurationMinutes).toBeGreaterThan(
      result.summary.totalDistanceKm * result.summary.averagePace - 0.05,
    );
  });

  it('returns empty state when scenario undefined', () => {
    const result = buildTimeline(undefined);
    expect(result.points).toHaveLength(0);
    expect(result.summary.totalDistanceKm).toBe(0);
  });
});
