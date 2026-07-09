import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  children: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}

export function SectionHeader({
  children,
  icon: Icon,
  iconClassName = "text-muted-foreground",
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Icon && <Icon size={14} className={iconClassName} />}
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}
