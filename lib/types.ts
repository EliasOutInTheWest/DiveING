export type Spot = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  max_depth_m: number | null;
  level: string | null;
  best_season: string | null;
  country_code: string | null;
};

export type School = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  website: string | null;
  phone: string | null;
  email: string | null;
  country_code: string | null;
};

export type Selection = { kind: 'spot' | 'school'; id: string };

export const SPOT_COLUMNS = 'id,name,description,lat,lng,max_depth_m,level,best_season,country_code';
export const SCHOOL_COLUMNS = 'id,name,description,lat,lng,website,phone,email,country_code';

// [longitude, latitude]
export type LngLat = [number, number];

export type RouteLine = { type: 'LineString'; coordinates: LngLat[] };

export type BoatRoute = {
  id: string;
  school_id: string;
  spot_id: string;
  geojson: RouteLine;
  duration_min: number | null;
  notes: string | null;
};

// What the user is currently doing on the map
export type Mode =
  | { type: 'idle' }
  | { type: 'place'; kind: 'spot' | 'school'; at: LngLat | null }
  | { type: 'route'; schoolId: string; spotId: string | null; waypoints: LngLat[] };

// Average rating + number of reviews of a spot or school
export type RatingInfo = { avg: number; count: number };
