"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CrawlResult, PageAnalysis } from "@/types/canvas";

interface SiteContextValue {
  crawlId: string;
  crawlResult: CrawlResult | null;
  setCrawlResult: (r: CrawlResult | null) => void;
  discoveredUrls: string[];
  setDiscoveredUrls: (urls: string[]) => void;
  isArabicSite: boolean;
  // In-memory cache for current session (Convex handles persistence)
  analysisCache: Map<string, PageAnalysis>;
  setAnalysis: (url: string, analysis: PageAnalysis) => void;
  getAnalysis: (url: string) => PageAnalysis | undefined;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  showImages: boolean;
  setShowImages: (v: boolean) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
  crawlId,
  initialData,
  initialDiscoveredUrls,
  isArabicSite = false,
  children,
}: {
  crawlId: string;
  initialData: CrawlResult | null;
  initialDiscoveredUrls?: string[];
  isArabicSite?: boolean;
  children: ReactNode;
}) {
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(initialData);
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>(initialDiscoveredUrls ?? []);
  const [analysisCache] = useState(() => new Map<string, PageAnalysis>());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showImages, setShowImages] = useState(true);

  const setAnalysis = useCallback(
    (url: string, analysis: PageAnalysis) => {
      analysisCache.set(url, analysis);
    },
    [analysisCache]
  );

  const getAnalysis = useCallback(
    (url: string) => analysisCache.get(url),
    [analysisCache]
  );

  return (
    <SiteContext value={{
      crawlId,
      crawlResult,
      setCrawlResult,
      discoveredUrls,
      setDiscoveredUrls,
      isArabicSite,
      analysisCache,
      setAnalysis,
      getAnalysis,
      sidebarCollapsed,
      setSidebarCollapsed,
      showImages,
      setShowImages,
    }}>
      {children}
    </SiteContext>
  );
}

export function useSiteContext() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSiteContext must be used within SiteProvider");
  return ctx;
}
