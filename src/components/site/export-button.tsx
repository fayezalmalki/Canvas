"use client";

import { useState } from "react";
import { useSiteContext } from "@/context/site-context";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Check } from "lucide-react";

export function ExportButton({ rootUrl }: { rootUrl: string }) {
  const { crawlResult } = useSiteContext();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

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

      // Show "Exported!" feedback
      setExported(true);
      setTimeout(() => setExported(false), 2000);
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
      title={`Export as ${domain}-seo-report.pdf`}
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : exported ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {exporting ? "Exporting..." : exported ? "Exported!" : "Export PDF"}
    </Button>
  );
}
