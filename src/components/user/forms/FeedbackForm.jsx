import { useState, useCallback, useEffect } from "react";
import { submitRentalFeedback } from "@services/feedbackService";
import useBackHandler from "@hooks/useBackHandler";
import { Star, MessageSquare, Send, X } from "lucide-react";

const starScale = [1, 2, 3, 4, 5];

export default function FeedbackForm({ rentalId, userId, onSuccess, onSkip, onLoadingChange }) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(null);

  const hasContent = rating !== null || feedback.trim().length > 0;

  const handleClose = useCallback(() => {
    if (!loading) {
      onSkip?.();
    }
  }, [loading, onSkip]);

  useBackHandler(true, handleClose, 110);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  useEffect(
    () => () => {
      onLoadingChange?.(false);
    },
    [onLoadingChange]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasContent) {
      alert("Please share a rating or add a quick note before submitting.");
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);
    try {
      await submitRentalFeedback({ rentalId, userId, rating, feedback });
      onSuccess?.();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative w-full rounded-2xl border border-gray-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-900"
          aria-label="Close feedback form"
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#052844]/10 text-[#052844]">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">We'd love your take</p>
              <h3 className="mt-1 text-xl font-semibold text-gray-900">How was your rental experience?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Your feedback helps us keep RawLens rentals smooth and reliable for every shoot.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-800">
              Rate the overall experience
            </label>
            <div className="flex justify-center gap-2 py-2">
              {starScale.map((star) => {
                const isActive = hoverRating ? hoverRating >= star : rating >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
                    aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                    aria-pressed={rating === star}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors duration-150 ${
                        isActive ? "fill-[#052844] text-[#052844]" : "text-gray-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-center text-sm font-medium text-gray-500">
              {rating ? `${rating} of 5` : "Tap a star to choose"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              Tell us more <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="What stood out about the gear, delivery, or support?"
              className="w-full min-h-[120px] resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition focus:border-[#052844] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#052844]/30"
            />
            <p className="text-xs text-gray-400">
              Quick note: we share highlights with the team and keep everything else confidential.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Skip for now
            </button>
            <button
              type="submit"
              disabled={loading || !hasContent}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#052844] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#063a5e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}