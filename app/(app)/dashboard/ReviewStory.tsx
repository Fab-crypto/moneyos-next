"use client";

import { useState, useTransition } from "react";

interface ReviewStoryProps {
  snapshot: {
    id: string;
    type: "weekly" | "monthly";
  };
  slides: React.ReactNode[];
  onDismissed?: () => void;
  onClose?: () => void;
}

export function ReviewStory({ snapshot, slides, onDismissed, onClose }: ReviewStoryProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isLastSlide = index === slides.length - 1;

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/reviews/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: snapshot.id }),
        });
        const result = await response.json();

        if (!response.ok) {
          setError(result.error ?? "Failed to save. Please try again.");
          return;
        }

        setOpen(false);
        onDismissed?.();
      } catch (err) {
        console.error("[review-story] dismiss failed:", err);
        setError("Failed to save. Please try again.");
      }
    });
  }

  function handleNext() {
    if (isLastSlide) {
      handleComplete();
      return;
    }
    setIndex((currentIndex) => currentIndex + 1);
  }

  function handlePrevious() {
    setIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  if (!open || slides.length === 0) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Financial review"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      onClick={handleNext}
    >
      <div className="flex gap-1.5 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {slides.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: i <= index ? "100%" : "0%" }} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="Close review"
        className="absolute right-4 top-[max(2.5rem,calc(env(safe-area-inset-top)+1.75rem))] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
      >
        ✕
      </button>

      <div className="flex flex-1 items-center justify-center px-8">{slides[index]}</div>

      {error && (
        <p role="alert" className="px-8 pb-2 text-center text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {index > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            disabled={isPending}
            className="text-[14px] text-white/60 disabled:opacity-50"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <p className="text-[13px] text-white/40">{isPending ? "Saving..." : "Tap to continue"}</p>
      </div>
    </div>
  );
}
