
import { useState } from "react";

const initialForm = {
    name: "",
    email: "",
    orderNumber: "",
    products: "",
    confirmed: false,
};

export default function WithdrawalForm() {
    const apiBase = import.meta.env.VITE_API_URL;

    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    function updateField(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (submitting || result?.success) return;

        setSubmitting(true);
        setError("");

        try {
            if (!apiBase) {
                throw new Error("Servizio momentaneamente non disponibile.");
            }

            const response = await fetch(
                `${apiBase.replace(/\/+$/, "")}/api/withdrawals`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(form),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Non è stato possibile inviare la dichiarazione."
                );
            }

            setResult(data);
        } catch (err) {
            setError(
                err.message ||
                "Si è verificato un errore. Contatta assistenza@qbeautyshop.it."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (result?.success) {
        return (
            <section aria-live="polite">
                <h2>Dichiarazione di recesso ricevuta</h2>

                <p>
                    La tua dichiarazione è stata registrata correttamente.
                </p>

                <p>
                    <strong>Numero di riferimento:</strong>{" "}
                    <span style={{ overflowWrap: "anywhere" }}>
                        {result.reference}
                    </span>
                </p>

                <p>
                    <strong>Data di ricezione:</strong>{" "}
                    {new Date(result.receivedAt).toLocaleString("it-IT", {
                        timeZone: "Europe/Rome",
                        dateStyle: "short",
                        timeStyle: "short",
                    })}
                </p>

                <p>
                    {result.confirmationSent
                        ? "Abbiamo inviato una conferma al tuo indirizzo email."
                        : "La dichiarazione è stata registrata, ma non è stato possibile inviare la conferma email. Conserva il numero di riferimento e contatta l'assistenza."}
                </p>
            </section>
        );
    }

    return (
        <section aria-labelledby="withdrawal-title">
            <h2 id="withdrawal-title">
                Esercita il diritto di recesso
            </h2>

            <p>
                Compila il modulo per comunicare la tua decisione
                di recedere dal contratto di acquisto.
                Non è necessario indicare una motivazione.
            </p>

            <form
                onSubmit={handleSubmit}
                style={{
                    display: "grid",
                    gap: 18,
                    marginTop: 24,
                }}
            >
                <label style={{ display: "grid", gap: 6 }}>
                    Nome e cognome
                    <input
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={120}
                        value={form.name}
                        onChange={(event) =>
                            updateField("name", event.target.value)
                        }
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    Indirizzo email
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={form.email}
                        onChange={(event) =>
                            updateField("email", event.target.value)
                        }
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    Numero ordine
                    <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="Es. #2026001"
                        value={form.orderNumber}
                        onChange={(event) =>
                            updateField("orderNumber", event.target.value)
                        }
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    Prodotti interessati dal recesso
                    <textarea
                        required
                        maxLength={2000}
                        rows={4}
                        placeholder="Indica i prodotti oppure scrivi: intero ordine"
                        value={form.products}
                        onChange={(event) =>
                            updateField("products", event.target.value)
                        }
                        style={{
                            ...inputStyle,
                            resize: "vertical",
                        }}
                    />
                </label>

                <label
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                    }}
                >
                    <input
                        type="checkbox"
                        required
                        checked={form.confirmed}
                        onChange={(event) =>
                            updateField("confirmed", event.target.checked)
                        }
                        style={{ marginTop: 5 }}
                    />

                    <span>
                        Dichiaro espressamente di voler recedere dal
                        contratto di acquisto relativo ai prodotti indicati.
                    </span>
                </label>

                {error && (
                    <p role="alert" style={{ color: "#ffaaaa" }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        padding: "14px 22px",
                        border: "none",
                        borderRadius: 10,
                        background: "#debe68",
                        color: "#181818",
                        fontWeight: 700,
                        cursor: submitting ? "wait" : "pointer",
                        opacity: submitting ? 0.65 : 1,
                    }}
                >
                    {submitting
                        ? "Invio in corso..."
                        : "Conferma il recesso"}
                </button>
            </form>

            <p style={{ marginTop: 20 }}>
                Per assistenza puoi scrivere a{" "}
                <a href="mailto:assistenza@qbeautyshop.it">
                    assistenza@qbeautyshop.it
                </a>.
            </p>
        </section>
    );
}

const inputStyle = {
    width: "100%",
    minWidth: 0,
    padding: "12px 14px",
    border: "1px solid rgba(212,175,55,.35)",
    borderRadius: 8,
    background: "#252525",
    color: "#ffffff",
    font: "inherit",
};
