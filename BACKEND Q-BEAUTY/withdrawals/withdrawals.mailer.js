
const { sendMail } = require("../utils/mailer");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDate(date) {
    return new Date(date).toLocaleString("it-IT", {
        timeZone: "Europe/Rome",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

async function sendWithdrawalCustomerEmail(withdrawal) {
    const date = formatDate(withdrawal.receivedAt);
    const reference = String(withdrawal._id);

    const subject = "Q•BEAUTY | Conferma ricezione dichiarazione di recesso";

    const text = `Gentile ${withdrawal.name},

confermiamo di aver ricevuto la tua dichiarazione di recesso.

Riferimento: ${reference}
Ordine indicato: ${withdrawal.orderNumber}
Prodotti: ${withdrawal.products}
Data e ora di ricezione: ${date} (ora italiana)

Dichiarazione trasmessa:
"${withdrawal.declaration}"

La dichiarazione è stata registrata. La gestione della
restituzione e dell'eventuale rimborso avverrà secondo
le condizioni applicabili e la normativa vigente.

Per assistenza: assistenza@qbeautyshop.it

Q•BEAUTY`;

    return sendMail({
        to: withdrawal.email,
        subject,
        text,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#222">
      <h2>Q•BEAUTY</h2>
      <p>Gentile ${escapeHtml(withdrawal.name)},</p>
      <p>Confermiamo di aver ricevuto la tua dichiarazione di recesso.</p>
      <p>
        <strong>Riferimento:</strong> ${escapeHtml(reference)}<br/>
        <strong>Ordine indicato:</strong> ${escapeHtml(withdrawal.orderNumber)}<br/>
        <strong>Prodotti:</strong> ${escapeHtml(withdrawal.products)}<br/>
      <strong>Ricezione:</strong> ${escapeHtml(date)} (ora italiana)
</p>
<p>
  <strong>Dichiarazione trasmessa:</strong><br/>
  "${escapeHtml(withdrawal.declaration)}"
</p>
<p>La dichiarazione è stata registrata. La restituzione e
      l'eventuale rimborso saranno gestiti secondo la normativa applicabile.</p>
      <p>Assistenza: assistenza@qbeautyshop.it</p>
    </div>`,
    });
}

async function sendWithdrawalAdminEmail(withdrawal) {
    const adminTo = String(process.env.MAIL_ADMIN_TO || "")
        .split(/[,;]+/)
        .map((email) => email.trim())
        .filter(Boolean);

    if (!adminTo.length) {
        throw new Error("MAIL_ADMIN_TO non configurata");
    }

    const subject = `Q•BEAUTY | Nuovo recesso - Ordine ${withdrawal.orderNumber}`;

    const text = `Nuova dichiarazione di recesso ricevuta.

Riferimento: ${withdrawal._id}
Nome: ${withdrawal.name}
Email: ${withdrawal.email}
Ordine: ${withdrawal.orderNumber}
Prodotti: ${withdrawal.products}
Data ricezione: ${formatDate(withdrawal.receivedAt)} (ora italiana)

Verificare manualmente la richiesta.`;

    return sendMail({
        to: adminTo,
        subject,
        text,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.7">
      <h2>Nuova dichiarazione di recesso</h2>
      <p>
        <strong>Riferimento:</strong> ${escapeHtml(withdrawal._id)}<br/>
        <strong>Nome:</strong> ${escapeHtml(withdrawal.name)}<br/>
        <strong>Email:</strong> ${escapeHtml(withdrawal.email)}<br/>
        <strong>Ordine:</strong> ${escapeHtml(withdrawal.orderNumber)}<br/>
        <strong>Prodotti:</strong> ${escapeHtml(withdrawal.products)}<br/>
        <strong>Ricezione:</strong> ${escapeHtml(formatDate(withdrawal.receivedAt))}
      </p>
      <p>La richiesta deve essere verificata e gestita manualmente.</p>
    </div>`,
    });
}

module.exports = {
    sendWithdrawalCustomerEmail,
    sendWithdrawalAdminEmail,
};
