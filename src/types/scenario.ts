import type { Position } from 'geojson';

export type PaceUnit = 'minPerKm' | 'kmPerHour';

export type ScenarioSegment = {
  id: string;
  label: string;
  /**
   * GeoJSON positions [longitude, latitude].
   */
  points: Position[];
  /**
    * pace in minutes per km. Defaults to 6 (10km/h) if undefined.
    */
  pace: number;
  dwellMs?: number;
  easing?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
};

export type Scenario = {
  id: string;
  name: string;
  description?: string;
  segments: ScenarioSegment[];
  createdAt: number;
  updatedAt: number;
};

export type TimelinePoint = {
  segmentId: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  distanceFromStartM: number;
  timestampMs: number;
  speedMps: number;
};

export type ScenarioSummary = {
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  averagePace: number;
};
