import type { Scenario, ScenarioSegment, ScenarioSummary, TimelinePoint } from '@/types/scenario';
import { calculatePolylineLength, toLonLat } from '@/utils/geo';

type BuildTimelineOptions = {
  startAtMs?: number;
};

const DEFAULT_PACE = 6; // min per km

const paceToSpeed = (pace: number) => {
  const value = pace || DEFAULT_PACE;
  const minutes = value;
  const speedMetersPerSecond = 1000 / (minutes * 60);
  return speedMetersPerSecond;
};

const interpolateSegment = ({
  segment,
  startTimestamp,
  distanceOffset,
}: {
  segment: ScenarioSegment;
  startTimestamp: number;
  distanceOffset: number;
}): { points: TimelinePoint[]; endTimestamp: number; distance: number } => {
  const length = calculatePolylineLength(segment.points);
  if (length === 0) {
    return { points: [], endTimestamp: startTimestamp, distance: 0 };
  }

  const speed = paceToSpeed(segment.pace);
  const duration = length / speed;
  const dwell = (segment.dwellMs ?? 0) / 1000;
  const totalDuration = duration + dwell;
  const sampleCount = Math.max(2, Math.ceil(length / 15));
  const deltaT = duration / (sampleCount - 1);
  const timeline: TimelinePoint[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const point = segment.points[index] ?? segment.points[segment.points.length - 1];
    const coordinate = toLonLat(point);
    timeline.push({
      segmentId: segment.id,
      coordinate: {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      },
      distanceFromStartM: distanceOffset + (length * index) / (sampleCount - 1),
      timestampMs: startTimestamp + index * deltaT * 1000,
      speedMps: speed,
    });
  }

  return {
    points: timeline,
    endTimestamp: startTimestamp + totalDuration * 1000,
    distance: length,
  };
};

export const buildTimeline = (
  scenario: Scenario | undefined,
  options?: BuildTimelineOptions,
): { points: TimelinePoint[]; summary: ScenarioSummary } => {
  if (!scenario) {
    return {
      points: [],
      summary: { totalDistanceKm: 0, estimatedDurationMinutes: 0, averagePace: DEFAULT_PACE },
    };
  }

  const startAtMs = options?.startAtMs ?? Date.now();
  let cursor = startAtMs;
  let distanceOffset = 0;
  const timeline: TimelinePoint[] = [];
  let totalDuration = 0;

  scenario.segments.forEach((segment) => {
    const { points, endTimestamp, distance } = interpolateSegment({
      segment,
      startTimestamp: cursor,
      distanceOffset,
    });

    timeline.push(...points);
    totalDuration += (endTimestamp - cursor) / 1000;
    cursor = endTimestamp;
    distanceOffset += distance;
  });

  const totalDistanceKm = distanceOffset / 1000;
  const estimatedDurationMinutes = totalDuration / 60;
  const averagePace = totalDistanceKm > 0 ? estimatedDurationMinutes / totalDistanceKm : DEFAULT_PACE;

  return {
    points: timeline,
    summary: {
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedDurationMinutes: Number(estimatedDurationMinutes.toFixed(1)),
      averagePace: Number(averagePace.toFixed(2)),
    },
  };
};
