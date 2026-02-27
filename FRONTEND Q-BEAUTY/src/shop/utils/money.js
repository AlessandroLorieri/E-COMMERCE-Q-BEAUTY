export function toCents(eur) {
    return Math.round(Number(eur) * 100);
}

export function formatEUR(eur) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(eur);
}

export function formatEURFromCents(cents) {
    return formatEUR((Number(cents) || 0) / 100);
}
