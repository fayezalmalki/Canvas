"use client";

import { useState, useMemo } from "react";
import { useSiteContext } from "@/context/site-context";
import { buildUrlTree, filterTree } from "@/lib/url-tree";
import { UrlTree } from "./url-tree";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, Search } from "lucide-react";

export function SiteSidebar() {
  const { crawlResult } = useSiteContext();
  const [search, setSearch] = useState("");

  const tree = useMemo(() => {
    if (!crawlResult) return null;
    return buildUrlTree(crawlResult.pages);
  }, [crawlResult]);

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    if (!search.trim()) return tree;
    return filterTree(tree, search.trim());
  }, [tree, search]);

  if (!crawlResult) return null;

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Sitemap
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter pages..."
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {crawlResult.pages.length} pages crawled
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {filteredTree ? (
          <UrlTree node={filteredTree} rootUrl={crawlResult.rootUrl} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No matches</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
