import type { ReactNode } from "react";

interface MoneyCardProps {
  children: ReactNode;
  glow?: boolean;
  padded?: boolean;
  className?: string;
}

export function MoneyCard({ children, glow = false, padded = true, className = "" }: MoneyCardProps) {
  return (
    <div
      className={`card-premium box-border w-full overflow-hidden ${glow ? "hero-glow" : ""} ${
        padded ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
