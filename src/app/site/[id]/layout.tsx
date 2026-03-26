"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
  const { id } = use(params);
  const router = useRouter();

  const crawlData = useQuery(api.crawls.getCrawlById, { id: id as Id<"crawls"> });

  // Redirect to home if no data found
  useEffect(() => {
    if (crawlData === null) {
      router.replace("/");
    }
  }, [crawlData, router]);

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
      crawlId={id}
      initialData={crawlData}
      initialDiscoveredUrls={crawlData.discoveredUrls}
      isArabicSite={isArabicSite}
    >
      <SiteLayoutInner>{children}</SiteLayoutInner>
    </SiteProvider>
  );
}
