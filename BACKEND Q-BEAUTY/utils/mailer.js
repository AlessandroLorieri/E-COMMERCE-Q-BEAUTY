const nodemailer = require("nodemailer");

function must(name) {
    const v = process.env[name];
    if (!v) throw new Error(`${name} mancante in .env`);
    return v;
}

const port = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
    host: must("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: { user: must("SMTP_USER"), pass: must("SMTP_PASS") },
});


function resolveRecipient(to) {
    const safe = String(process.env.MAIL_SAFE_MODE || "") === "1";
    if (!safe) return to;

    const testTo = must("MAIL_TEST_TO");
    return testTo;
}

async function sendMail({ to, subject, html, text }) {
    const from = must("MAIL_FROM");
    const finalTo = resolveRecipient(to);

    return transporter.sendMail({
        from,
        to: finalTo,
        subject,
        html,
        text,
    });
}

async function verifySmtp() {
    return transporter.verify();
}

// MAIL DI BENVENUTO
async function sendWelcomeEmail({ to, name }) {
    const safeName = String(name || "").trim();
    const hello = safeName ? `Ciao ${safeName},` : "Ciao,";

    const subject = "Benvenuto su Q•BEAUTY ✅";

    const text = `${hello}
    il tuo account è stato creato correttamente.

    Puoi accedere allo shop e completare i tuoi acquisti quando vuoi.

    Q•BEAUTY`;

    const html = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.45">
    <h2 style="margin:0 0 10px;">Benvenuto su Q•BEAUTY ✅</h2>
    <p style="margin:0 0 10px;">${hello}<br/>il tuo account è stato creato correttamente.</p>
    <p style="margin:0 0 10px;">Puoi accedere allo shop e completare i tuoi acquisti quando vuoi.</p>
    <p style="margin:16px 0 0; color:#555;">Q•BEAUTY</p>
    </div>`;

    return sendMail({ to, subject, html, text });
}

//  MAIL SPEDIZIONE 
async function sendShipmentEmail({ to, name, publicId, carrierName, trackingCode, trackingUrl }) {
    const safeName = String(name || "").trim();
    const hello = safeName ? `Ciao ${safeName},` : "Ciao,";

    const pid = String(publicId || "").trim() || "il tuo ordine";
    const carrier = String(carrierName || "").trim() || "il corriere";
    const code = String(trackingCode || "").trim();
    const url = String(trackingUrl || "").trim();

    const subject = `Q•BEAUTY | Ordine ${pid} spedito 📦`;

    const text = `${hello}
il tuo ordine ${pid} è stato spedito con ${carrier}.

${code ? `Codice tracking: ${code}\n` : ""}${url ? `Link tracking: ${url}\n` : ""}

Q•BEAUTY`;

    const html = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.45">
      <h2 style="margin:0 0 10px;">Ordine ${pid} spedito 📦</h2>
      <p style="margin:0 0 10px;">${hello}<br/>il tuo ordine <b>${pid}</b> è stato spedito con <b>${carrier}</b>.</p>

      ${code ? `<p style="margin:0 0 10px;"><b>Codice tracking:</b> ${code}</p>` : ""}
      ${url ? `<p style="margin:0 0 10px;"><a href="${url}" target="_blank" rel="noopener">Segui la spedizione</a></p>` : ""}

      <p style="margin:16px 0 0; color:#555;">Q•BEAUTY</p>
    </div>`;

    return sendMail({ to, subject, html, text });
}

// EMAIL: Pagamento confermato 
function formatEURFromCents(cents) {
    const n = Number(cents) || 0;
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n / 100);
}

function escapeHtml(s) {
    return String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function buildItemsText(items) {
    return items
        .map((it) => {
            const name = it?.name || "Prodotto";
            const qty = Number(it?.qty) || 1;
            const line = formatEURFromCents(it?.lineTotalCents);
            return `- ${qty}× ${name} (${line})`;
        })
        .join("\n");
}

function buildItemsRowsHtml(items) {
    return items
        .map((it) => {
            const name = escapeHtml(it?.name || "Prodotto");
            const qty = Number(it?.qty) || 1;
            const line = escapeHtml(formatEURFromCents(it?.lineTotalCents));
            return `
        <tr>
          <td style="padding:8px 0;">${name}</td>
          <td style="padding:8px 0; text-align:center;">${qty}</td>
          <td style="padding:8px 0; text-align:right;">${line}</td>
        </tr>
      `;
        })
        .join("");
}

async function sendOrderPaymentConfirmedEmail({ to, order, includeItems = false }) {
    if (!to) throw new Error("Recipient mancante (to)");

    const publicId = String(order?.publicId || "").trim();
    const orderIdFallback = String(order?._id || "").trim();
    const orderLabel = publicId || orderIdFallback || "ordine";

    const subtotal = formatEURFromCents(order?.subtotalCents);
    const discountCents = Number(order?.discountCents) || 0;
    const discountLabel = String(order?.discountLabel || "").trim();
    const shippingCents = Number(order?.shippingCents) || 0;
    const shipping = shippingCents === 0 ? "Gratis" : formatEURFromCents(shippingCents);
    const total = formatEURFromCents(order?.totalCents);

    const items = Array.isArray(order?.items) ? order.items : [];
    const hasItems = includeItems && items.length > 0;

    const subject = `Q•BEAUTY — Pagamento confermato ${orderLabel}`.trim();

    const text = hasItems
        ? `Pagamento confermato ✅
Ordine: ${orderLabel}
Totale: ${total}

Articoli:
${buildItemsText(items)}

Riepilogo:
Subtotale: ${subtotal}
${discountCents > 0 ? `Sconto${discountLabel ? ` (${discountLabel})` : ""}: -${formatEURFromCents(discountCents)}` : ""}
Spedizione: ${shipping}
Totale: ${total}

Q•BEAUTY`
        : `Pagamento confermato ✅
Ordine: ${orderLabel}
Totale: ${total}

Riepilogo:
Subtotale: ${subtotal}
${discountCents > 0 ? `Sconto${discountLabel ? ` (${discountLabel})` : ""}: -${formatEURFromCents(discountCents)}` : ""}
Spedizione: ${shipping}
Totale: ${total}

Q•BEAUTY`;

    const itemsTableHtml = hasItems
        ? `
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 0; border-bottom:1px solid #eee;">Prodotto</th>
            <th style="text-align:center; padding:8px 0; border-bottom:1px solid #eee;">Qta</th>
            <th style="text-align:right; padding:8px 0; border-bottom:1px solid #eee;">Totale</th>
          </tr>
        </thead>
        <tbody>
          ${buildItemsRowsHtml(items)}
        </tbody>
      </table>
    `
        : "";

    const breakdownHtml = `
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <tbody>
          <tr>
            <td style="padding:4px 0;">Subtotale</td>
            <td style="padding:4px 0; text-align:right;">${escapeHtml(subtotal)}</td>
          </tr>
          ${discountCents > 0
            ? `<tr>
                      <td style="padding:4px 0;">Sconto${discountLabel ? ` (${escapeHtml(discountLabel)})` : ""}</td>
                      <td style="padding:4px 0; text-align:right;">- ${escapeHtml(formatEURFromCents(discountCents))}</td>
                    </tr>`
            : ""
        }
          <tr>
            <td style="padding:4px 0;">Spedizione</td>
            <td style="padding:4px 0; text-align:right;">${escapeHtml(shipping)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:700;">Totale</td>
            <td style="padding:8px 0; text-align:right; font-weight:700;">${escapeHtml(total)}</td>
          </tr>
        </tbody>
      </table>
    `;

    const html = `
    <div style="font-family:Arial,sans-serif; line-height:1.45; color:#111;">
      <h2 style="margin:0 0 10px;">Pagamento confermato ✅</h2>
      <p style="margin:0 0 10px;">
        Abbiamo ricevuto il pagamento del tuo ordine <strong>${escapeHtml(orderLabel)}</strong>.
      </p>
      ${itemsTableHtml}
      ${breakdownHtml}
      <p style="margin:14px 0 0; color:#555;">Q•BEAUTY</p>
    </div>
  `;

    return sendMail({ to, subject, html, text });
}

// MAIL BONIFICO
async function sendBankTransferInstructionsEmail({
    to,
    order,
    name,
    publicId,
    beneficiary,
    iban,
    deadlineHours,
}) {
    if (!to) throw new Error("Recipient mancante (to)");
    if (!order) throw new Error("Order mancante (order)");

    const safeName = String(name || "").trim();
    const hello = safeName ? `Ciao ${safeName},` : "Ciao,";

    const pid =
        String(publicId || "").trim() ||
        String(order?.publicId || "").trim() ||
        `#${String(order?._id || "").slice(-6)}`;

    const finalBeneficiary =
        String(beneficiary || process.env.BANK_BENEFICIARY || "Q•BEAUTY").trim();

    const finalIban = String(iban || process.env.BANK_IBAN || "").trim();
    if (!finalIban) throw new Error("BANK_IBAN mancante in .env");

    const hours = Number(deadlineHours || process.env.BANK_DEADLINE_HOURS || 48);
    const deadlineText = `entro ${hours} ore`;

    const total = formatEURFromCents(order?.totalCents);

    const subject = `Q•BEAUTY — Istruzioni bonifico ${pid}`.trim();

    const text = `${hello}
    Istruzioni bonifico

    Ordine: ${pid}
    Importo: ${total}

    Intestatario: ${finalBeneficiary}
    IBAN: ${finalIban}

    Causale: ${pid}

    Ti chiediamo di effettuare il pagamento ${deadlineText}.
    Quando riceveremo l’accredito, aggiorneremo lo stato dell’ordine.

    Q•BEAUTY`;

    const html = `
    <div style="font-family:Arial,sans-serif; line-height:1.45; color:#111;">
    <h2 style="margin:0 0 10px;">Istruzioni bonifico</h2>
    <p style="margin:0 0 10px;">
    ${escapeHtml(hello)}<br/>
    Ordine: <strong>${escapeHtml(pid)}</strong><br/>
    Importo: <strong>${escapeHtml(total)}</strong>
    </p>

    <div style="border:1px solid #ddd; border-radius:10px; padding:12px; margin:12px 0;">
        <div><strong>Intestatario:</strong> ${escapeHtml(finalBeneficiary)}</div>
        <div style="margin-top:6px;"><strong>IBAN:</strong> ${escapeHtml(finalIban)}</div>
        <div style="margin-top:10px;"><strong>Causale:</strong> ${escapeHtml(pid)}</div>
    </div>

    <p style="margin:0 0 10px;">
        Ti chiediamo di effettuare il pagamento <strong>${escapeHtml(deadlineText)}</strong>.
        Quando riceveremo l’accredito, aggiorneremo lo stato dell’ordine.
    </p>

    <p style="margin:16px 0 0; color:#555;">Q•BEAUTY</p>
    </div>`;

    return sendMail({ to, subject, html, text });
}

//  MAIL RESET PASSWORD
async function sendPasswordResetEmail({ to, name, resetUrl }) {
    if (!to) throw new Error("Recipient mancante (to)");
    if (!resetUrl) throw new Error("resetUrl mancante (resetUrl)");

    const safeName = String(name || "").trim();
    const hello = safeName ? `Ciao ${safeName},` : "Ciao,";

    const subject = "Q•BEAUTY — Recupero password";

    const text = `${hello}
Hai richiesto il recupero della password.

Apri questo link per impostarne una nuova:
${resetUrl}

Se non sei stato tu, ignora questa email.

Q•BEAUTY`;

    const html = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.45">
      <h2 style="margin:0 0 10px;">Recupero password</h2>
      <p style="margin:0 0 10px;">${hello}<br/>hai richiesto il recupero della password.</p>
      <p style="margin:0 0 10px;">
        <a href="${resetUrl}" target="_blank" rel="noopener">Imposta una nuova password</a>
      </p>
      <p style="margin:0 0 10px; color:#555;">
        Se non sei stato tu, ignora questa email.
      </p>
      <p style="margin:16px 0 0; color:#555;">Q•BEAUTY</p>
    </div>`;

    return sendMail({ to, subject, html, text });
}

module.exports = {
    sendMail,
    verifySmtp,
    sendWelcomeEmail,
    sendShipmentEmail,
    sendOrderPaymentConfirmedEmail,
    sendBankTransferInstructionsEmail,
    sendPasswordResetEmail
};



