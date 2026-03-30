"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useLocale } from "@/context/locale-context";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("error.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("error.description")}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            {t("error.tryAgain")}
          </Button>
          <Button size="sm" onClick={() => router.push("/")}>
            <Home className="h-4 w-4" />
            {t("error.goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
