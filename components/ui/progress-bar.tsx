import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const over = value > max;

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-[var(--color-hairline)]", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: over ? "var(--color-negative)" : "var(--color-accent)",
        }}
      />
    </div>
  );
}
