import { useState } from "react";
import { submitRentalFeedback } from "../services/feedbackService";
import { Star, MessageSquare, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-full max-w-md"
    >
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 p-5 flex justify-between items-center">
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
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
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
                      ? "text-blue-500 fill-blue-500"
                      : "text-gray-300"
                  } transition-colors duration-200`}
                />
              </motion.button>
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
            className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSkip}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Skip
          </motion.button>
          
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || (rating === null && !feedback.trim())}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-800 rounded-lg text-white font-medium hover:from-blue-800 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Feedback
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}