import Link from "next/link";
import { LayoutGrid, ArrowLeftRight, PiggyBank, Wallet, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface)] md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="font-[family-name:var(--font-display)] text-[19px] italic text-[var(--color-ink)]">
          MoneyOS
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const active = i === 0; // Dashboard active by default in this mock shell
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[14px] transition-colors ${
                active
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-hairline)]/50 hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon size={17} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-hairline)] px-6 py-4 text-[12px] text-[var(--color-faint)]">
        Mock data · Auth coming soon
      </div>
    </aside>
  );
}
