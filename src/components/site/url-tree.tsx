"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { UrlTreeNode } from "@/lib/url-tree";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  ExternalLink,
} from "lucide-react";

export function UrlTree({
  node,
  rootUrl,
}: {
  node: UrlTreeNode;
  rootUrl: string;
}) {
  return (
    <div className="space-y-0.5">
      <TreeNodeItem node={node} depth={0} rootUrl={rootUrl} defaultOpen />
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  rootUrl,
  defaultOpen = false,
}: {
  node: UrlTreeNode;
  depth: number;
  rootUrl: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 1);
  const hasChildren = node.children.length > 0;
  const router = useRouter();
  const params = useParams();

  // Determine if this node is the currently active page
  const currentPath = Array.isArray(params.path)
    ? "/" + params.path.join("/")
    : params.path
      ? "/" + params.path
      : null;
  const isActive = node.fullPath === (currentPath || "/");

  function handleClick() {
    if (hasChildren) setOpen(!open);
    if (node.crawled && node.url) {
      const encodedRoot = encodeURIComponent(rootUrl);
      const parsed = new URL(node.url);
      const pagePath = parsed.pathname === "/" ? "" : parsed.pathname;
      if (pagePath) {
        // Remove leading slash for the route param
        router.push(`/site/${encodedRoot}/${pagePath.slice(1)}`);
      } else {
        router.push(`/site/${encodedRoot}`);
      }
    }
  }

  return (
    <div>
      <button
        className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs transition-colors hover:bg-accent ${
          isActive
            ? "bg-accent text-foreground"
            : node.crawled
              ? "text-foreground"
              : "text-muted-foreground/50"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {hasChildren ? (
          open ? (
            <FolderOpen className="h-3 w-3 shrink-0 text-amber-500/70" />
          ) : (
            <Folder className="h-3 w-3 shrink-0 text-amber-500/70" />
          )
        ) : (
          <FileText className="h-3 w-3 shrink-0" />
        )}

        <span className="truncate font-mono">{node.segment}</span>

        {node.title && (
          <span className="ml-auto truncate text-muted-foreground pl-2 max-w-[120px]">
            {node.title}
          </span>
        )}

        {node.crawled && (
          <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
        )}
      </button>

      {open &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            rootUrl={rootUrl}
          />
        ))}
    </div>
  );
}
