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
  activity: string;
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
  activity: string;
};

export type Selection = { kind: 'spot' | 'school'; id: string };

export const SPOT_COLUMNS = 'id,name,description,lat,lng,max_depth_m,level,best_season,country_code,activity';
export const SCHOOL_COLUMNS = 'id,name,description,lat,lng,website,phone,email,country_code,activity';

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

// One post in the feed (photo or video), as returned by the database function get_feed()
export type FeedItem = {
  id: string;
  user_id: string;
  spot_id: string;
  type: string; // 'image' | 'video'
  storage_path: string;
  poster_path: string | null;
  duration_s: number | null;
  caption: string | null;
  created_at: string;
  username: string | null;
  cert_level: string | null;
  spot_name: string | null;
  spot_country: string | null;
  spot_activity: string | null;
  like_count: number;
  liked: boolean;
};
