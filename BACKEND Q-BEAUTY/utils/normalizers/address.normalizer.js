function collapseSpaces(s) {
    return String(s || "")
        .replace(/\s+/g, " ")
        .trim();
}

function toTitleCaseItalian(s) {
    const cleaned = collapseSpaces(s).toLowerCase();
    if (!cleaned) return "";

    const lowerWords = new Set(["di", "da", "del", "della", "dei", "degli", "delle", "e", "a", "al", "alla", "alle", "ai", "agli", "in", "su"]);

    return cleaned
        .split(" ")
        .map((w) => {
            if (lowerWords.has(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(" ");
}

function normalizeEmail(email) {
    return collapseSpaces(email).toLowerCase();
}

function normalizeCap(cap) {
    const digits = String(cap || "").replace(/\D/g, "");
    return digits.trim();
}

function normalizeShippingAddress(addr) {
    const a = addr && typeof addr === "object" ? addr : {};

    const streetNumberRaw = typeof a.streetNumber === "string" ? a.streetNumber : "";
    const streetNumber = collapseSpaces(streetNumberRaw);

    const addressRaw = collapseSpaces(a.address);
    let finalAddress = addressRaw;
    let finalStreetNumber = streetNumber;

    if (!finalStreetNumber) {
        const m = addressRaw.match(/^(.*?)[,\s]+(\d+[A-Za-z]?)$/);
        if (m) {
            finalAddress = collapseSpaces(m[1]);
            finalStreetNumber = collapseSpaces(m[2]);
        }
    }

    return {
        name: toTitleCaseItalian(a.name),
        surname: toTitleCaseItalian(a.surname),
        phone: collapseSpaces(a.phone),
        email: normalizeEmail(a.email),

        address: finalAddress,
        streetNumber: finalStreetNumber,

        city: toTitleCaseItalian(a.city),
        cap: normalizeCap(a.cap),
    };
}

module.exports = { normalizeShippingAddress };
