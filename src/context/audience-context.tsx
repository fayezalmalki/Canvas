"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Audience = "owner" | "consultant";

interface AudienceContextValue {
  audience: Audience;
  setAudience: (audience: Audience) => void;
}

const STORAGE_KEY = "baseera-audience";
const AudienceContext = createContext<AudienceContextValue | null>(null);

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>(() => {
    if (typeof window === "undefined") return "owner";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "consultant" ? "consultant" : "owner";
    } catch {
      return "owner";
    }
  });

  const value = useMemo<AudienceContextValue>(() => ({
    audience,
    setAudience(nextAudience) {
      setAudienceState(nextAudience);
      try {
        localStorage.setItem(STORAGE_KEY, nextAudience);
      } catch {}
    },
  }), [audience]);

  return (
    <AudienceContext.Provider value={value}>
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience() {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error("useAudience must be used within AudienceProvider");
  return ctx;
}
