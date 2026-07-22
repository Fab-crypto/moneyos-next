import { Share2 } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import type { MonthlyStoryData } from "@/lib/reviews";

async function handleShare(story: MonthlyStoryData) {
  const isNegative = story.moneySaved < 0;
  const text = `MoneyOS — ${story.monthLabel}\nMoney saved: ${isNegative ? "-" : ""}$${formatMoney(
    Math.abs(story.moneySaved)
  )}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
    } catch {
      // user canceled — no action needed
    }
  } else if (typeof navigator !== "undefined") {
    await navigator.clipboard.writeText(text);
  }
}

export function buildMonthlyStorySlides(story: MonthlyStoryData): React.ReactNode[] {
  const isNegative = story.moneySaved < 0;
  const featuredGoal = story.goals[0] ?? null;

  const slides: React.ReactNode[] = [
    <div key="title" className="text-center">
      <p className="font-heading text-[56px] font-bold leading-none">{story.monthLabel}</p>
      <p className="mt-3 text-[16px] text-white/60">Your Financial Story</p>
    </div>,

    <div key="earned" className="text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">You Earned</p>
      <p className="font-heading gold-text mt-4 text-[64px] font-bold leading-none">${formatMoney(story.earned)}</p>
    </div>,

    <div key="saved" className="text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">You Saved</p>
      <p
        className={`font-heading mt-4 text-[64px] font-bold leading-none ${
          isNegative ? "text-danger" : "text-success"
        }`}
      >
        {isNegative ? "-" : ""}${formatMoney(Math.abs(story.moneySaved))}
      </p>
    </div>,

    <div key="confidence" className="text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">Financial Confidence</p>
      <p className="font-heading gold-text mt-4 text-[64px] font-bold leading-none">{story.confidenceScore}</p>
    </div>,
  ];

  if (featuredGoal) {
    slides.push(
      <div key="goal" className="text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">Goal Progress</p>
        <p className="mt-4 text-[18px] text-white">{featuredGoal.name}</p>
        <p className="font-heading gold-text mt-2 text-[64px] font-bold leading-none">
          {featuredGoal.progressPct}%
        </p>
        {story.isFirstMonthTracked && (
          <p className="mt-5 max-w-[280px] text-[13px] leading-relaxed text-white/50">
            First month being tracked — next month&apos;s story will show real progress.
          </p>
        )}
      </div>
    );
  }

  slides.push(
    <div key="closing" className="flex flex-col items-center text-center">
      <p className="max-w-[280px] text-[20px] font-medium leading-relaxed text-white">{story.closingLine}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleShare(story);
        }}
        className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-medium text-black"
      >
        <Share2 size={15} />
        Share your story
      </button>
      <p className="mt-6 text-[12px] text-white/40">Tap the X to close</p>
    </div>
  );

  return slides;
}
