import { AnimatePresence, motion } from "framer-motion";
import ReviewCard from "./ReviewCard";

export default function ReviewsMasonry({ reviews, pageKey }) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pageKey}
                className="qb-reviews-masonry"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
                {reviews.map((review, index) => (
                    <ReviewCard
                        key={review.id}
                        review={review}
                        index={index}
                        slotClass={`qb-review-card--slot-${index + 1}`}
                    />
                ))}
            </motion.div>
        </AnimatePresence>
    );
}