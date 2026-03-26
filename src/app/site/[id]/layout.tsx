"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteProvider } from "@/context/site-context";
import { SiteHeader } from "@/components/site/site-header";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { useSiteContext } from "@/context/site-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

function SiteLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, isArabicSite } = useSiteContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-full flex-col" dir={isArabicSite ? "rtl" : "ltr"}>
      <SiteHeader onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!sidebarCollapsed && (
          <div className={`hidden md:block w-[260px] shrink-0 ${isArabicSite ? "order-last" : ""}`}>
            <SiteSidebar />
          </div>
        )}
        {/* Mobile sidebar as Sheet */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side={isArabicSite ? "right" : "left"} className="w-[280px] p-0">
            <SiteSidebar onNavigate={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function SiteLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id: slug } = use(params);
  const router = useRouter();

  // Accept slugs (8 chars) or legacy Convex IDs (32 chars) — both alphanumeric
  const isValidId = /^[a-z0-9]{4,}$/i.test(slug);
  const crawlData = useQuery(
    api.crawls.getCrawlBySlug,
    isValidId ? { slug } : "skip"
  );

  // Redirect to home if no data found or invalid ID
  useEffect(() => {
    if (crawlData === null || !isValidId) {
      console.warn("[Baseera] Crawl not found for slug:", slug, { isValidId, crawlData });
      router.replace("/");
    }
  }, [crawlData, isValidId, slug, router]);

  // Detect if site is primarily Arabic
  const isArabicSite = useMemo(() => {
    if (!crawlData?.pages) return false;
    const arabicPages = crawlData.pages.filter(
      (p: any) => p.seo?.i18n?.hasArabicContent
    );
    return arabicPages.length > crawlData.pages.length / 2;
  }, [crawlData]);

  // Loading state
  if (crawlData === undefined || !crawlData) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading site data...</p>
      </div>
    );
  }

  return (
    <SiteProvider
      crawlId={slug}
      initialData={crawlData}
      initialDiscoveredUrls={crawlData.discoveredUrls}
      isArabicSite={isArabicSite}
    >
      <SiteLayoutInner>{children}</SiteLayoutInner>
    </SiteProvider>
  );
}
