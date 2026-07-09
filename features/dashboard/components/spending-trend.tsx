"use client";

export function SpendingTrend() {
  return (
    <div className="card-premium p-6">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Spending Trend
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground/90">$214</span> over the last 7 days
      </p>
      <div className="flex h-24 items-end justify-between gap-2.5">
        {[30, 45, 25, 55, 38, 70, 90].map((h, i) => (
          <div key={i} className="h-full flex-1 rounded-full bg-muted-foreground/20">
            <div
              className={i === 6 ? "rounded-full bg-gold" : "rounded-full bg-muted-foreground/30"}
              style={{ height: `${h}%`, marginTop: `${100 - h}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
