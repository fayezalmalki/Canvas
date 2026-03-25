"use client";

import { useState } from "react";
import { useSiteContext } from "@/context/site-context";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export function ExportButton({ rootUrl }: { rootUrl: string }) {
  const { crawlResult } = useSiteContext();
  const [exporting, setExporting] = useState(false);

  let domain = "";
  try {
    domain = new URL(rootUrl).hostname;
  } catch {
    domain = rootUrl;
  }

  async function handleExport() {
    if (!crawlResult || exporting) return;
    setExporting(true);

    try {
      const { generatePdf } = await import("@/lib/pdf-export");
      const blob = await generatePdf(crawlResult);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${domain}-seo-report-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting || !crawlResult}
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export PDF
    </Button>
  );
}
