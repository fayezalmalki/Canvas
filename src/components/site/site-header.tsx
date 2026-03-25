"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { deduplicatePages } from "@/lib/dedup-pages";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SeoChat } from "@/components/site/seo-chat";
import { ExportButton } from "@/components/site/export-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Globe,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  ImageIcon,
  ImageOff,
} from "lucide-react";

export function SiteHeader({ rootUrl }: { rootUrl: string }) {
  const router = useRouter();
  const {
    crawlResult,
    sidebarCollapsed,
    setSidebarCollapsed,
    showImages,
    setShowImages,
  } = useSiteContext();
  const [chatOpen, setChatOpen] = useState(false);
  const pageCount = useMemo(() => {
    if (!crawlResult) return 0;
    return deduplicatePages(crawlResult.pages).length;
  }, [crawlResult]);

  let domain = "";
  try {
    domain = new URL(rootUrl).hostname;
  } catch {
    domain = rootUrl;
  }

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
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

      <Separator orientation="vertical" className="h-5" />

      <button
        onClick={() => {
          const encodedRoot = encodeURIComponent(rootUrl);
          router.push(`/site/${encodedRoot}`);
        }}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm font-medium">{domain}</span>
      </button>

      {crawlResult && (
        <span className="text-xs text-muted-foreground">
          {pageCount} pages
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            onClick={() => setShowImages(!showImages)}
          >
            {showImages ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <ImageOff className="h-4 w-4" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {showImages ? "Hide images" : "Show images"}
          </TooltipContent>
        </Tooltip>

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
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
