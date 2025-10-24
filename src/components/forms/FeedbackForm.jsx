import { React, useState } from "react";
import { submitRentalFeedback } from "../../services/feedbackService";
import { Star, MessageSquare, Send, X } from "lucide-react";

export default function FeedbackForm({ rentalId, userId, onSuccess, onSkip }) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === null && !feedback.trim()) {
      alert("Please provide a rating or feedback before submitting.");
      return;
    }

    setLoading(true);
    try {
      await submitRentalFeedback({ rentalId, userId, rating, feedback });
      onSuccess?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden w-full max-w-md">
      <div className="bg-[#052844] p-5 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare size={20} />
          Share Your Experience
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            How would you rate your experience?
          </label>
          <div className="flex gap-1 justify-center py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(star)}
                className="relative p-1"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  size={32}
                  className={`${
                    (hoverRating >= star || rating >= star)
                      ? "text-[#052844] fill-[#052844]"
                      : "text-gray-300"
                  } transition-colors duration-200`}
                />
              </button>
            ))}
          </div>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-500">
              {rating ? `${rating} of 5 stars` : "Select rating"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Additional Feedback <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us about your experience..."
            className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#052844] focus:border-transparent transition-all duration-150 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Skip
          </button>
          
          <button
            type="submit"
            disabled={loading || (rating === null && !feedback.trim())}
            className="flex-1 py-3 px-4 bg-[#052844] rounded-lg text-white font-medium hover:bg-[#063a5e] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}