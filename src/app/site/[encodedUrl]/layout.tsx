"use client";

import { use, useState } from "react";
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
  rootUrl,
  children,
}: {
  rootUrl: string;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useSiteContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <SiteHeader rootUrl={rootUrl} onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!sidebarCollapsed && (
          <div className="hidden md:block w-[260px] shrink-0">
            <SiteSidebar />
          </div>
        )}
        {/* Mobile sidebar as Sheet */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
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
  params: Promise<{ encodedUrl: string }>;
  children: React.ReactNode;
}) {
  const { encodedUrl } = use(params);
  const rootUrl = decodeURIComponent(encodedUrl);
  const router = useRouter();

  const crawlData = useQuery(api.crawls.getCrawlByUrl, { rootUrl });

  // Redirect to home if no data found (null means query resolved with no results)
  useEffect(() => {
    if (crawlData === null) {
      router.replace("/");
    }
  }, [crawlData, router]);

  // Loading state (undefined = query still loading)
  if (crawlData === undefined) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading site data...</p>
      </div>
    );
  }

  if (!crawlData) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading site data...</p>
      </div>
    );
  }

  return (
    <SiteProvider initialData={crawlData} initialDiscoveredUrls={crawlData.discoveredUrls}>
      <SiteLayoutInner rootUrl={rootUrl}>{children}</SiteLayoutInner>
    </SiteProvider>
  );
}
