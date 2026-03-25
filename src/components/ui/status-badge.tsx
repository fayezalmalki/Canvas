import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  success: "text-emerald-500 border-emerald-500/30",
  warning: "text-amber-500 border-amber-500/30",
  error: "text-red-500 border-red-500/30",
  info: "text-blue-500 border-blue-500/30",
  neutral: "text-muted-foreground",
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: "success" | "warning" | "error" | "info" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[status]} ${className ?? ""}`}
    >
      {children}
    </Badge>
  );
}
