import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--color-hairline)]/60 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-muted)]",
        className
      )}
      {...props}
    />
  );
}
