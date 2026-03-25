"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SeoChat } from "@/components/site/seo-chat";
import { ExportButton } from "@/components/site/export-button";
import {
  Globe,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
} from "lucide-react";

export function SiteHeader({ rootUrl }: { rootUrl: string }) {
  const router = useRouter();
  const { crawlResult, sidebarCollapsed, setSidebarCollapsed } = useSiteContext();
  const [chatOpen, setChatOpen] = useState(false);

  let domain = "";
  try {
    domain = new URL(rootUrl).hostname;
  } catch {
    domain = rootUrl;
  }

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border bg-card px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {sidebarCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm font-medium">{domain}</span>
      </div>

      {crawlResult && (
        <span className="text-xs text-muted-foreground">
          {crawlResult.pages.length} pages
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ExportButton rootUrl={rootUrl} />

        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="sm" />}
          >
            <MessageSquare className="h-4 w-4" />
            SEO Advisor
          </SheetTrigger>
          <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="text-sm font-semibold">SEO Advisor</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <SeoChat />
            </div>
          </SheetContent>
        </Sheet>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
        >
          New Crawl
        </Button>
      </div>
    </header>
  );
}
