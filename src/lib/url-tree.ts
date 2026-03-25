import type { CrawlPageResult } from "@/types/canvas";

export interface UrlTreeNode {
  segment: string;
  fullPath: string;
  url: string | null;
  title: string | null;
  crawled: boolean;
  children: UrlTreeNode[];
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function buildUrlTree(pages: CrawlPageResult[]): UrlTreeNode {
  // Deduplicate pages by normalized URL
  const crawledUrls = new Map<string, CrawlPageResult>();
  for (const page of pages) {
    const key = normalizeUrl(page.url);
    if (!crawledUrls.has(key)) {
      crawledUrls.set(key, page);
    }
  }

  // Only include crawled pages in the tree (not every outgoing link)
  const allUrls = new Set<string>();
  for (const key of crawledUrls.keys()) {
    allUrls.add(crawledUrls.get(key)!.url);
  }

  const root: UrlTreeNode = {
    segment: "/",
    fullPath: "/",
    url: null,
    title: null,
    crawled: false,
    children: [],
  };

  for (const urlStr of allUrls) {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      continue;
    }

    const pathname = parsed.pathname || "/";
    const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
    const page = crawledUrls.get(normalizeUrl(urlStr));

    let current = root;

    if (segments.length === 0) {
      current.url = urlStr;
      current.title = page?.title || null;
      current.crawled = !!page;
      continue;
    }

    let pathSoFar = "";
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      pathSoFar += "/" + seg;
      const isLast = i === segments.length - 1;

      let child = current.children.find((c) => c.segment === seg);
      if (!child) {
        child = {
          segment: seg,
          fullPath: pathSoFar,
          url: null,
          title: null,
          crawled: false,
          children: [],
        };
        current.children.push(child);
      }

      if (isLast) {
        child.url = urlStr;
        child.title = page?.title || null;
        child.crawled = !!page;
      }

      current = child;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: UrlTreeNode) {
  node.children.sort((a, b) => a.segment.localeCompare(b.segment));
  for (const child of node.children) {
    sortTree(child);
  }
}

export function filterTree(
  node: UrlTreeNode,
  query: string
): UrlTreeNode | null {
  const q = query.toLowerCase();

  const matchesSelf =
    node.segment.toLowerCase().includes(q) ||
    (node.title?.toLowerCase().includes(q) ?? false) ||
    node.fullPath.toLowerCase().includes(q);

  const filteredChildren = node.children
    .map((c) => filterTree(c, query))
    .filter(Boolean) as UrlTreeNode[];

  if (matchesSelf || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }

  return null;
}
