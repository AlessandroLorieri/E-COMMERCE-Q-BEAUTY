import { motion } from "framer-motion";

function formatReviewDate(value) {
    try {
        return new Date(value).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "";
    }
}

export default function ReviewCard({ review, index = 0, slotClass = "" }) {
    const accent = review?.accent || "gold";
    const size = review?.size || "normal";

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            whileHover={{
                y: -5,
                scale: 1.008,
                rotate: accent === "rose" ? 0.18 : accent === "gold" ? -0.16 : 0.12,
            }}
            whileTap={{
                scale: 0.992,
                y: -1,
            }}
            transition={{
                type: "spring",
                stiffness: 180,
                damping: 22,
                mass: 0.9,
                delay: index * 0.035,
            }}
            className={`qb-review-card qb-review-card--${accent} qb-review-card--${size} ${slotClass}`}
        >
            <div className="qb-review-card__quote">“</div>

            <div className="qb-review-card__top">
                
                <div>
                    <div className="qb-review-card__name">{review.name}</div>
                </div>

                <div className="qb-review-card__rating" aria-label={`${review.rating} su 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < review.rating ? "is-on" : ""}>
                            ★
                        </span>
                    ))}
                </div>
            </div>

            <p className="qb-review-card__text">{review.text}</p>

            <div className="qb-review-card__bottom">
                <span className="qb-review-card__date">{formatReviewDate(review.createdAt)}</span>
            </div>
        </motion.article>
    );
}