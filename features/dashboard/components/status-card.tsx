"use client";

export function StatusCard({ confidence, safeToSpend, message }: any) {
  return (
    <div className="card-premium hero-glow p-8">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Financial Confidence
        </span>
        <span className="text-xs font-medium text-success">{confidence}% Excellent</span>
      </div>

      <p className="mb-2 mt-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Safe to Spend Today
      </p>

      <p className="font-heading text-[72px] font-bold leading-none tracking-[-0.02em] text-foreground">
        ${safeToSpend.toFixed(2)}
      </p>

      <p className="mt-5 max-w-[80%] text-[15px] leading-relaxed text-muted-foreground/80">
        {message}
      </p>
    </div>
  );
}
