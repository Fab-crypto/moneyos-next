import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-premium p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gold-bg">
        <Icon size={22} className="gold-text" />
      </div>
      <p className="mt-4 text-[17px] font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
