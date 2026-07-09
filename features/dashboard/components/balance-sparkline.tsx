import type { BalancePoint } from "@/types/finance";

/**
 * A hand-drawn-feeling ink-stroke line, not a charting-library sparkline.
 * Stroke width varies slightly along the path to feel like a pen, not a plot.
 */
export function BalanceSparkline({ data }: { data: BalancePoint[] }) {
  const width = 320;
  const height = 72;
  const padding = 6;

  const values = data.map((d) => d.balanceCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.balanceCents - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Balance trend over the last 6 months">
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle cx={last.x} cy={last.y} r={3} fill="var(--color-accent)" />
    </svg>
  );
}
