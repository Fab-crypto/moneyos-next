import type { ButtonHTMLAttributes, ReactNode } from "react";

type MoneyButtonVariant = "primary" | "secondary" | "destructive";
type MoneyButtonSize = "md" | "lg";

interface MoneyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: MoneyButtonVariant;
  size?: MoneyButtonSize;
}

const VARIANT_CLASS: Record<MoneyButtonVariant, string> = {
  primary: "bg-foreground text-background hover:opacity-90",
  secondary: "text-muted-foreground hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

const SIZE_CLASS: Record<MoneyButtonSize, string> = {
  md: "h-12 text-[14px]",
  lg: "h-14 text-[15px]",
};

export function MoneyButton({
  children,
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: MoneyButtonProps) {
  return (
    <button
      className={`flex w-full items-center justify-center gap-2 rounded-xl font-medium transition-opacity active:opacity-80 disabled:opacity-50 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
