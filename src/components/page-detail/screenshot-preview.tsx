"use client";

export function ScreenshotPreview({
  screenshot,
  title,
}: {
  screenshot: string;
  title: string;
}) {
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
