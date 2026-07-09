export type MoodTone = "success" | "warning" | "danger" | "neutral";

const TONE_TEXT: Record<MoodTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted-foreground",
};

const TONE_DOT: Record<MoodTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted-foreground",
};

interface MoodBadgeProps {
  label: string;
  tone: MoodTone;
  emoji?: string;
  showDot?: boolean;
}

export function MoodBadge({ label, tone, emoji, showDot = false }: MoodBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
      {emoji ? (
        <span>{emoji}</span>
      ) : showDot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      ) : null}
      <span className={`text-xs font-medium ${TONE_TEXT[tone]}`}>{label}</span>
    </div>
  );
}
