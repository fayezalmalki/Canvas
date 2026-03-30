"use client";

import type { BrokenLink, RedirectChain } from "@/types/canvas";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Link2Off } from "lucide-react";

interface BrokenLinksPanelProps {
  brokenLinks: BrokenLink[];
  redirectChains: RedirectChain[];
}

export function BrokenLinksPanel({ brokenLinks, redirectChains }: BrokenLinksPanelProps) {
  const { t } = useLocale();

  if (brokenLinks.length === 0 && redirectChains.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Link2Off className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("broken.noIssues")}</p>
      </div>
    );
  }

  // Sort broken links by severity (5xx first, then 4xx, then 0 for network errors)
  const sortedBroken = [...brokenLinks].sort((a, b) => {
    const aSeverity = a.statusCode >= 500 ? 0 : a.statusCode >= 400 ? 1 : 2;
    const bSeverity = b.statusCode >= 500 ? 0 : b.statusCode >= 400 ? 1 : 2;
    return aSeverity - bSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Broken Links */}
      {sortedBroken.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-medium">
              {t("broken.brokenLinks")} ({sortedBroken.length})
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {sortedBroken.map((link) => (
              <div key={link.url} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-mono ${
                      link.statusCode >= 500
                        ? "text-red-500 border-red-500/30"
                        : link.statusCode >= 400
                          ? "text-amber-500 border-amber-500/30"
                          : "text-muted-foreground"
                    }`}
                  >
                    {link.statusCode || "ERR"}
                  </Badge>
                  <span className="text-sm font-mono truncate">{shortUrl(link.url)}</span>
                </div>
                {link.referringPages.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {t("broken.linkedFrom")}{" "}
                    {link.referringPages.slice(0, 3).map((ref) => shortUrl(ref)).join(", ")}
                    {link.referringPages.length > 3 && ` +${link.referringPages.length - 3} more`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redirect Chains */}
      {redirectChains.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">
              {t("broken.redirectChains")} ({redirectChains.length})
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {redirectChains.map((chain, i) => (
              <div key={i} className="p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                    {shortUrl(chain.from)}
                  </span>
                  {chain.statusCodes.map((code, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono text-amber-500 border-amber-500/30">
                        {code}
                      </Badge>
                      {j < chain.statusCodes.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </span>
                  ))}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-xs font-mono truncate max-w-[200px]">
                    {shortUrl(chain.to)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {chain.hops} {t("broken.hops")}
                  {chain.hops > 1 && ` — ${t("broken.reduceRedirect")}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function shortUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
