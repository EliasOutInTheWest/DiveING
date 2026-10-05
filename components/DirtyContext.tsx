'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

// Keeps track of unsaved input (edit form, review draft, photo caption ...)
// so the map can ask before it closes a panel.
type Dirty = {
  setDirty: (key: string, dirty: boolean) => void;
  isDirty: () => boolean;
};

const DirtyContext = createContext<Dirty>({ setDirty: () => {}, isDirty: () => false });

export const useDirty = () => useContext(DirtyContext);

export function DirtyProvider({ children }: { children: ReactNode }) {
  const keys = useRef(new Set<string>());
  const value = useMemo<Dirty>(
    () => ({
      setDirty: (key, dirty) => {
        if (dirty) keys.current.add(key);
        else keys.current.delete(key);
      },
      isDirty: () => keys.current.size > 0,
    }),
    []
  );
  return <DirtyContext.Provider value={value}>{children}</DirtyContext.Provider>;
}

// Call this in a component: useDirtyFlag('review', hasUnsavedText)
export function useDirtyFlag(key: string, dirty: boolean) {
  const { setDirty } = useDirty();
  useEffect(() => {
    setDirty(key, dirty);
    return () => setDirty(key, false);
  }, [key, dirty, setDirty]);
}
