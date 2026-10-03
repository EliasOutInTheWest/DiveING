'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SCHOOL_COLUMNS,
  SPOT_COLUMNS,
  type School,
  type Selection,
  type Spot,
} from '@/lib/types';
import DiveMap from '@/components/DiveMap';
import SidePanel from '@/components/SidePanel';
import AuthBox from '@/components/AuthBox';

export default function MapApp() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const [spotsRes, schoolsRes] = await Promise.all([
        supabase.from('spots').select(SPOT_COLUMNS),
        supabase.from('schools').select(SCHOOL_COLUMNS),
      ]);
      if (spotsRes.error) console.error('spots error:', spotsRes.error.message);
      if (schoolsRes.error) console.error('schools error:', schoolsRes.error.message);
      setSpots((spotsRes.data as Spot[]) ?? []);
      setSchools((schoolsRes.data as School[]) ?? []);
    }
    load();
  }, []);

  const item = selected
    ? selected.kind === 'spot'
      ? spots.find((s) => s.id === selected.id)
      : schools.find((s) => s.id === selected.id)
    : undefined;

  function handleSaved(kind: 'spot' | 'school', updated: Spot | School) {
    if (kind === 'spot') {
      setSpots((prev) => prev.map((s) => (s.id === updated.id ? (updated as Spot) : s)));
    } else {
      setSchools((prev) => prev.map((s) => (s.id === updated.id ? (updated as School) : s)));
    }
  }

  return (
    <div className="relative h-full w-full">
      <DiveMap spots={spots} schools={schools} selected={selected} onSelect={setSelected} />
      <AuthBox onAdminChange={setIsAdmin} />
      {selected && item && (
        <SidePanel
          key={`${selected.kind}-${selected.id}`}
          kind={selected.kind}
          item={item}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
