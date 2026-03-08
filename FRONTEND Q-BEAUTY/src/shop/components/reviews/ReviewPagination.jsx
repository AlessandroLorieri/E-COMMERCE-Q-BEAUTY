export default function ReviewPagination({ page, pages, onPrev, onNext, onGoTo }) {
    if (pages <= 1) return null;

    return (
        <div className="qb-reviews-pagination">
            <button
                type="button"
                className="qb-reviews-pagination__btn"
                onClick={onPrev}
                disabled={page <= 1}
            >
                Prev
            </button>

            <div className="qb-reviews-pagination__dots">
                {Array.from({ length: pages }).map((_, i) => {
                    const value = i + 1;
                    const active = value === page;

                    return (
                        <button
                            key={value}
                            type="button"
                            className={`qb-reviews-pagination__dot ${active ? "is-active" : ""}`}
                            onClick={() => onGoTo(value)}
                            aria-label={`Vai alla pagina ${value}`}
                        >
                            {value}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                className="qb-reviews-pagination__btn"
                onClick={onNext}
                disabled={page >= pages}
            >
                Next
            </button>
        </div>
    );
}