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
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  ImageIcon,
  ImageOff,
  Menu,
} from "lucide-react";

export function SiteHeader({ rootUrl, onMobileMenuToggle }: { rootUrl: string; onMobileMenuToggle?: () => void }) {
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
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onMobileMenuToggle}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="hidden md:inline-flex"
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
        className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
      >
        <span className="text-sm font-bold text-gradient-brand shrink-0">بصيرة</span>
        <span className="font-mono text-sm font-medium truncate">{domain}</span>
      </button>

      {crawlResult && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {pageCount} pages
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" />}
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

        <span className="hidden sm:inline-flex">
          <ExportButton rootUrl={rootUrl} />
        </span>

        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="sm" />}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">SEO Advisor</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="text-sm font-semibold">SEO Advisor</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <SeoChat />
            </div>
          </SheetContent>
        </Sheet>

        <ThemeToggle />

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
