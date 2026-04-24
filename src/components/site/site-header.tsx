"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { useAudience } from "@/context/audience-context";
import { useLocale } from "@/context/locale-context";
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
  Home,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  MessageSquare,
  ImageIcon,
  ImageOff,
  Menu,
  Share2,
  Check,
  Languages,
} from "lucide-react";

export function SiteHeader({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const router = useRouter();
  const { locale, setLocale, t, isRtl } = useLocale();
  const { audience } = useAudience();
  const {
    crawlId,
    crawlResult,
    sidebarCollapsed,
    setSidebarCollapsed,
    showImages,
    setShowImages,
  } = useSiteContext();
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pageCount = useMemo(() => {
    if (!crawlResult) return 0;
    return deduplicatePages(crawlResult.pages).length;
  }, [crawlResult]);

  const rootUrl = crawlResult?.rootUrl ?? "";
  const advisorLabel = locale === "ar" ? "المرشد الذكي" : "Guided Advisor";
  const audienceLabel = locale === "ar"
    ? audience === "owner" ? "صاحب الموقع" : "وكالة"
    : audience === "owner" ? "Owner" : "Agency";
  let domain = "";
  try {
    domain = new URL(rootUrl).hostname;
  } catch {
    domain = rootUrl;
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  // Use RTL-aware sidebar icons
  const SidebarCollapseIcon = isRtl ? PanelRightClose : PanelLeftClose;
  const SidebarExpandIcon = isRtl ? PanelRight : PanelLeft;

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
          <SidebarExpandIcon className="h-4 w-4" />
        ) : (
          <SidebarCollapseIcon className="h-4 w-4" />
        )}
      </Button>

      <Separator orientation="vertical" className="h-5" />

      {/* Home button */}
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          onClick={() => router.push("/")}
        >
          <Home className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>{t("header.backToHome")}</TooltipContent>
      </Tooltip>

      <button
        onClick={() => router.push(`/site/${crawlId}`)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
      >
        <span className="text-sm font-bold text-gradient-brand shrink-0">بصيرة</span>
        <span className="font-mono text-sm font-medium truncate">{domain}</span>
      </button>

      {crawlResult && (
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-xs text-muted-foreground">
            {pageCount} {t("header.pages")}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {audienceLabel}
          </span>
        </div>
      )}

      <div className="ms-auto flex items-center gap-1.5">
        {/* Language Toggle */}
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          >
            <Languages className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            {locale === "en" ? "العربية" : "English"}
          </TooltipContent>
        </Tooltip>

        {/* Share/Copy Link */}
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            onClick={handleCopyLink}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {copied ? t("header.copied") : t("header.copyLink")}
          </TooltipContent>
        </Tooltip>

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
            {showImages ? t("header.hideImages") : t("header.showImages")}
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
            <span className="hidden sm:inline">{advisorLabel}</span>
          </SheetTrigger>
          <SheetContent side={isRtl ? "left" : "right"} className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="text-sm font-semibold">{advisorLabel}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <SeoChat />
            </div>
          </SheetContent>
        </Sheet>

        <ThemeToggle />
      </div>
    </header>
  );
}
