"use client";

import { Globe } from "lucide-react";

export function ScreenshotPreview({
  screenshot,
  title,
}: {
  screenshot: string;
  title: string;
}) {
  if (!screenshot) {
    return (
      <div className="rounded-lg border border-border overflow-hidden bg-muted min-h-[200px] flex items-center justify-center flex-col gap-3">
        <Globe className="h-12 w-12 text-muted-foreground/40" />
        <div className="text-center px-4">
          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
            {title || "Untitled page"}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            No screenshot available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-muted">
      <img
        src={screenshot}
        alt={`Screenshot of ${title}`}
        className="w-full max-h-[400px] object-cover object-top"
      />
    </div>
  );
}
