export type Spot = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  max_depth_m: number | null;
  level: string | null;
  best_season: string | null;
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
};

export type Selection = { kind: 'spot' | 'school'; id: string };

export const SPOT_COLUMNS = 'id,name,description,lat,lng,max_depth_m,level,best_season';
export const SCHOOL_COLUMNS = 'id,name,description,lat,lng,website,phone,email';
