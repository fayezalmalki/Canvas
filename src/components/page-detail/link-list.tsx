"use client";

import type { OutgoingLink } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

const contextColors: Record<string, string> = {
  nav: "text-blue-400 border-blue-400/30",
  header: "text-purple-400 border-purple-400/30",
  footer: "text-zinc-400 border-zinc-400/30",
  main: "text-emerald-400 border-emerald-400/30",
  other: "text-muted-foreground border-border",
};

export function LinkList({ links }: { links: OutgoingLink[] }) {
  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No outgoing links found</p>
    );
  }

  // Group by context
  const grouped = new Map<string, OutgoingLink[]>();
  for (const link of links) {
    const group = grouped.get(link.context) || [];
    group.push(link);
    grouped.set(link.context, group);
  }

  const order = ["nav", "header", "main", "footer", "other"];
  const sorted = [...grouped.entries()].sort(
    (a, b) => order.indexOf(a[0]) - order.indexOf(b[0])
  );

  return (
    <div className="space-y-4">
      {sorted.map(([context, contextLinks]) => (
        <div key={context}>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${contextColors[context] || ""}`}
            >
              {context}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {contextLinks.length} links
            </span>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {contextLinks.map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-muted-foreground truncate">
                    {new URL(link.url).pathname}
                  </div>
                  {link.anchorText && (
                    <div className="text-xs truncate mt-0.5">
                      {link.anchorText}
                    </div>
                  )}
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
