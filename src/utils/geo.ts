import type { Position } from 'geojson';

const EARTH_RADIUS_METERS = 6371e3;

export type LonLat = {
  longitude: number;
  latitude: number;
};

export const toLonLat = (position: Position): LonLat => ({
  longitude: position[0],
  latitude: position[1],
});

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export const haversineDistance = (a: LonLat, b: LonLat) => {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
};

export const calculatePolylineLength = (points: Position[]) => {
  if (points.length < 2) {
    return 0;
  }

  return points.slice(1).reduce((distance, point, index) => {
    const previous = points[index];
    return distance + haversineDistance(toLonLat(previous), toLonLat(point));
  }, 0);
};
