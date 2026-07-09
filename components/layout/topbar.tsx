export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-hairline)] px-6 md:px-10">
      <h1 className="text-[15px] font-medium text-[var(--color-ink)]">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[var(--color-hairline)]" aria-hidden />
      </div>
    </header>
  );
}
