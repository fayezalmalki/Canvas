"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteProvider } from "@/context/site-context";
import { SiteHeader } from "@/components/site/site-header";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { useSiteContext } from "@/context/site-context";

function SiteLayoutInner({
  rootUrl,
  children,
}: {
  rootUrl: string;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useSiteContext();

  return (
    <div className="flex h-full flex-col">
      <SiteHeader rootUrl={rootUrl} />
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <div className="w-[260px] shrink-0">
            <SiteSidebar />
          </div>
        )}
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
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!crawlData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <SiteProvider initialData={crawlData}>
      <SiteLayoutInner rootUrl={rootUrl}>{children}</SiteLayoutInner>
    </SiteProvider>
  );
}
