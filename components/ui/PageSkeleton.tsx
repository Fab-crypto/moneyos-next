import { BottomNav } from "@/components/layout/BottomNav";
import { SHELL_WIDTH } from "@/lib/constants";

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto ${SHELL_WIDTH} min-h-screen bg-background sm:border-x sm:border-border/40`}>
        <main className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]">
          <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-56 animate-pulse rounded-lg bg-muted/70" />

          <div className="mt-8 h-40 animate-pulse rounded-3xl bg-muted/60" />
          <div className="mt-5 h-24 animate-pulse rounded-3xl bg-muted/50" />
          <div className="mt-5 h-24 animate-pulse rounded-3xl bg-muted/50" />
          <div className="mt-5 h-32 animate-pulse rounded-3xl bg-muted/40" />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
