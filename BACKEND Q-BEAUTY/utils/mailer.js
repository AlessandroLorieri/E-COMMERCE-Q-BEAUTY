const nodemailer = require("nodemailer");

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} mancante in .env`);
  return v;
}

const MAIL_TRANSPORT = String(process.env.MAIL_TRANSPORT || "smtp").toLowerCase();

const port = Number(process.env.SMTP_PORT || 587);

const transporter =
  MAIL_TRANSPORT === "smtp"
    ? nodemailer.createTransport({
      host: must("SMTP_HOST"),
      port,
      secure: port === 465,
      auth: { user: must("SMTP_USER"), pass: must("SMTP_PASS") },

      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
    })
    : null;


function resolveRecipient(to) {
  const safe = String(process.env.MAIL_SAFE_MODE || "") === "1";
  if (!safe) return to;

  const testTo = must("MAIL_TEST_TO");
  return testTo;
}

async function sendMailResend({ from, to, subject, html, text }) {
  const apiKey = must("RESEND_API_KEY");

  if (typeof fetch !== "function") {
    throw new Error("fetch non disponibile: assicurati di usare Node 18+ su Render");
  }

  const replyTo = String(process.env.MAIL_REPLY_TO || "").trim() || undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      reply_to: replyTo ? [replyTo] : undefined,
      subject,
      html,
      text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${data?.message || JSON.stringify(data)}`);
  }

  return data;
}

async function sendMail({ to, subject, html, text }) {
  const fromEmail = must("MAIL_FROM");
  const fromName = String(process.env.MAIL_FROM_NAME || "").trim();
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  const finalTo = resolveRecipient(to);

  if (MAIL_TRANSPORT === "smtp") {
    const replyTo = String(process.env.MAIL_REPLY_TO || "").trim() || undefined;

    return transporter.sendMail({
      from,
      to: finalTo,
      replyTo,
      subject,
      html,
      text,
    });
  }

  if (MAIL_TRANSPORT === "resend") {
    return sendMailResend({
      from,
      to: finalTo,
      subject,
      html,
      text,
    });
  }

  throw new Error(`MAIL_TRANSPORT non supportato: ${MAIL_TRANSPORT}`);
}

async function verifySmtp() {
  if (MAIL_TRANSPORT === "smtp") return transporter.verify();
  if (MAIL_TRANSPORT === "resend") return true;
  return false;
}

// EMAIL DI BENVENUTO
async function sendWelcomeEmail({ to, name }) {
  const safeNameRaw = String(name || "").trim().replace(/\s+/g, " ");

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function pickWelcomeWord(fullName) {
    const first = String(fullName || "")
      .trim()
      .split(/\s+/)[0]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (!first) return "Benvenuto/a";

    const maleEndingA = new Set(["luca", "andrea", "mattia", "elia", "tobia", "nicola"]);

    if (maleEndingA.has(first)) return "Benvenuto";
    if (first.endsWith("a")) return "Benvenuta";
    if (first.endsWith("o")) return "Benvenuto";

    return "Benvenuto/a";
  }

  const welcomeWord = pickWelcomeWord(safeNameRaw);

  const helloText = safeNameRaw ? `Ciao ${safeNameRaw},` : "Ciao,";
  const helloHtml = safeNameRaw ? `Ciao <strong>${esc(safeNameRaw)}</strong>,` : "Ciao,";

  const subject =
    welcomeWord === "Benvenuta"
      ? "Benvenuta su Q•BEAUTY ✨"
      : welcomeWord === "Benvenuto"
        ? "Benvenuto su Q•BEAUTY ✨"
        : "Ti diamo il benvenuto su Q•BEAUTY ✨";

  const baseUrl = (process.env.FRONTEND_URL || "https://qbeautyshop.it").replace(/\/+$/, "");
  const shopUrl = `${baseUrl}/shop`;

  const preheader = "Il tuo account è pronto. Entra nello shop e scopri i prodotti Q•BEAUTY.";

  const text = `${helloText}

${welcomeWord} in Q•BEAUTY! Il tuo account è stato creato correttamente.

Da ora puoi:
- accedere allo shop quando vuoi
- completare i tuoi acquisti in pochi click
- tenere traccia dei tuoi ordini

Entra qui:
${shopUrl}

A presto,
Q•BEAUTY
`;

  const html = `
  <div style="margin:0; padding:0; background:#f6f6f7;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${esc(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
            <tr>
              <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:center;">
                <div style="font-family:Arial, sans-serif; font-size:22px; letter-spacing:0.8px; color:#debe68; font-weight:800;">
                  Q•BEAUTY
                </div>
                <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                  Cura, qualità, risultati. Senza drammi.
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                <div style="font-family:Arial, sans-serif; color:#121212; line-height:1.55;">
                  <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                    ${esc(welcomeWord)} su Q•BEAUTY ✨
                  </h1>

                  <p style="margin:0 0 12px; font-size:14px;">
                    ${helloHtml}<br/>
                    il tuo account è stato creato correttamente. Da qui in poi è tutto più semplice.
                  </p>

                  <div style="margin:14px 0 16px; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                    <div style="font-size:13px; color:#2b2b2b; margin-bottom:8px; font-weight:700;">
                      Cosa puoi fare ora:
                    </div>
                    <ul style="margin:0; padding-left:18px; font-size:13px; color:#2b2b2b;">
                      <li style="margin:0 0 6px;">Accedere allo shop e scegliere i prodotti.</li>
                      <li style="margin:0 0 6px;">Gestire indirizzi e dati per la spedizione.</li>
                      <li style="margin:0;">Tenere traccia dei tuoi ordini in area personale.</li>
                    </ul>
                  </div>

                  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:18px 0 10px;">
                    <tr>
                      <td>
                        <a href="${shopUrl}"
                           style="display:inline-block; background:#DEBE68; color:#0b0b0c; text-decoration:none; font-family:Arial, sans-serif;
                                  font-size:14px; font-weight:700; padding:12px 16px; border-radius:12px;">
                          Entra nello shop
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:12px 0 0; font-size:12px; color:#666;">
                    Se non sei stato tu a creare questo account, puoi ignorare questa email.
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                  <div style="margin:0 0 6px;">Q•BEAUTY</div>
                  <div style="margin:0;">Questa è una comunicazione automatica legata al tuo account.</div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  return sendMail({ to, subject, html, text });
}


//  MAIL SPEDIZIONE 
async function sendShipmentEmail({ to, name, publicId, carrierName, trackingCode, trackingUrl }) {
  const safeNameRaw = String(name || "").trim().replace(/\s+/g, " ");

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const helloText = safeNameRaw ? `Ciao ${safeNameRaw},` : "Ciao,";
  const helloHtml = safeNameRaw ? `Ciao <strong>${esc(safeNameRaw)}</strong>,` : "Ciao,";

  const pid = String(publicId || "").trim() || "il tuo ordine";
  const carrier = String(carrierName || "").trim() || "il corriere";
  const code = String(trackingCode || "").trim();
  const rawUrl = String(trackingUrl || "").trim();

  const url =
    rawUrl && /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : rawUrl
        ? `https://${rawUrl.replace(/^\/+/, "")}`
        : "";

  const subject = `Q•BEAUTY | Ordine ${pid} spedito 📦`;
  const preheader = `Il tuo ordine ${pid} è in viaggio. Traccialo in un click.`;

  const text = `${helloText}

Buone notizie: l’ordine ${pid} è stato spedito con ${carrier}.

${code ? `Codice tracking: ${code}\n` : ""}${url ? `Traccia la spedizione: ${url}\n` : ""}

Grazie per aver scelto Q•BEAUTY.
`;

  const html = `
  <div style="margin:0; padding:0; background:#f6f6f7;">
    <!-- Preheader -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${esc(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
      <tr>
        <td align="center" style="padding:24px 12px;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
            <!-- Header brand -->
            <tr>
              <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#DEBE68; font-weight:700;">
                  Q•BEAUTY
                </div>
                <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                  Il tuo ordine è in viaggio 📦
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                <div style="font-family:Arial, sans-serif; color:#121212; line-height:1.55;">
                  <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                    Ordine ${esc(pid)} spedito 📦
                  </h1>

                  <p style="margin:0 0 12px; font-size:14px;">
                    ${helloHtml}<br/>
                    buone notizie: il tuo ordine <strong>${esc(pid)}</strong> è stato affidato a <strong>${esc(carrier)}</strong>.
                  </p>

                  <div style="margin:14px 0 16px; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                    <div style="font-size:13px; color:#2b2b2b; margin-bottom:8px; font-weight:700;">
                      Dettagli spedizione
                    </div>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:Arial, sans-serif; font-size:13px; color:#2b2b2b;">
                      <tr>
                        <td style="padding:4px 0; width:140px; color:#666;">Corriere</td>
                        <td style="padding:4px 0; font-weight:700;">${esc(carrier)}</td>
                      </tr>
                      ${code
      ? `<tr>
                              <td style="padding:4px 0; width:140px; color:#666;">Tracking</td>
                              <td style="padding:4px 0; font-weight:700;">${esc(code)}</td>
                            </tr>`
      : ""
    }
                    </table>
                  </div>

                  ${url
      ? `
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:18px 0 10px;">
                        <tr>
                          <td>
                            <a href="${esc(url)}"
                               style="display:inline-block; background:#DEBE68; color:#0b0b0c; text-decoration:none; font-family:Arial, sans-serif;
                                      font-size:14px; font-weight:700; padding:12px 16px; border-radius:12px;">
                              Segui la spedizione
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:10px 0 0; font-size:12px; color:#666;">
                        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
                        <span style="word-break:break-all;">${esc(url)}</span>
                      </p>
                      `
      : `
                      <p style="margin:12px 0 0; font-size:12px; color:#666;">
                        Appena disponibile un link di tracciamento, lo troverai anche nell’area ordini.
                      </p>
                      `
    }

                  <p style="margin:14px 0 0; font-size:12px; color:#666;">
                    Grazie per aver scelto Q•BEAUTY.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                  <div style="margin:0 0 6px;">Q•BEAUTY</div>
                  <div style="margin:0;">Email automatica legata al tuo ordine.</div>
                </div>
              </td>
            </tr>

            <!-- Bottom radius -->
            <tr>
              <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </div>`;

  return sendMail({ to, subject, html, text });
}

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

//EMAIL CONFERMA PAGAMENTO
async function sendOrderPaymentConfirmedEmail({ to, order, includeItems = false }) {
  if (!to) throw new Error("Recipient mancante (to)");

  const publicId = String(order?.publicId || "").trim();
  const orderIdFallback = String(order?._id || "").trim();
  const orderLabel = publicId || orderIdFallback || "ordine";

  // Nome (se disponibile) per rendere la mail meno “robotica”
  const firstNameRaw =
    String(order?.shippingAddress?.name || order?.billingAddress?.name || "").trim();

  const hello = firstNameRaw ? `Ciao ${firstNameRaw},` : "Ciao,";

  const subtotal = formatEURFromCents(order?.subtotalCents);
  const discountCents = Number(order?.discountCents) || 0;
  const discountLabel = String(order?.discountLabel || "").trim();
  const shippingCents = Number(order?.shippingCents) || 0;
  const shipping = shippingCents === 0 ? "Gratis" : formatEURFromCents(shippingCents);
  const total = formatEURFromCents(order?.totalCents);

  const items = Array.isArray(order?.items) ? order.items : [];
  const hasItems = includeItems && items.length > 0;

  const subject = `Q•BEAUTY | Pagamento confermato ✅ — Ordine ${orderLabel}`.trim();
  const preheader = `Pagamento ricevuto. Ordine ${orderLabel} confermato. Totale ${total}.`;

  const discountTextLine =
    discountCents > 0
      ? `Sconto${discountLabel ? ` (${discountLabel})` : ""}: -${formatEURFromCents(discountCents)}`
      : "";

  const text = hasItems
    ? `${hello}

Pagamento confermato ✅
Abbiamo ricevuto il pagamento del tuo ordine ${orderLabel}.

Totale pagato: ${total}

Articoli:
${buildItemsText(items)}

Riepilogo:
Subtotale: ${subtotal}
${discountTextLine ? `${discountTextLine}\n` : ""}Spedizione: ${shipping}
Totale: ${total}

Ti aggiorneremo appena la spedizione sarà affidata al corriere.

Q•BEAUTY
`
    : `${hello}

Pagamento confermato ✅
Abbiamo ricevuto il pagamento del tuo ordine ${orderLabel}.

Totale pagato: ${total}

Riepilogo:
Subtotale: ${subtotal}
${discountTextLine ? `${discountTextLine}\n` : ""}Spedizione: ${shipping}
Totale: ${total}

Ti aggiorneremo appena la spedizione sarà affidata al corriere.

Q•BEAUTY
`;

  const itemsTableHtml = hasItems
    ? `
      <div style="margin-top:14px; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
        <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:700;">
          Articoli acquistati
        </div>

        <table role="presentation" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px 0; border-bottom:1px solid #ececef; color:#666; font-weight:700;">Prodotto</th>
              <th style="text-align:center; padding:8px 0; border-bottom:1px solid #ececef; color:#666; font-weight:700; width:60px;">Qta</th>
              <th style="text-align:right; padding:8px 0; border-bottom:1px solid #ececef; color:#666; font-weight:700; width:100px;">Totale</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsRowsHtml(items)}
          </tbody>
        </table>
      </div>
    `
    : "";

  const breakdownHtml = `
      <div style="margin-top:14px; padding:12px 14px; background:#ffffff; border:1px solid #ececef; border-radius:12px;">
        <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:700;">
          Riepilogo pagamento
        </div>

        <table role="presentation" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
          <tbody>
            <tr>
              <td style="padding:6px 0; color:#666;">Subtotale</td>
              <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(subtotal)}</td>
            </tr>

            ${discountCents > 0
      ? `<tr>
                     <td style="padding:6px 0; color:#666;">Sconto${discountLabel ? ` (${escapeHtml(discountLabel)})` : ""
      }</td>
                     <td style="padding:6px 0; text-align:right; font-weight:700;">- ${escapeHtml(
        formatEURFromCents(discountCents)
      )}</td>
                   </tr>`
      : ""
    }

            <tr>
              <td style="padding:6px 0; color:#666;">Spedizione</td>
              <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(shipping)}</td>
            </tr>

            <tr>
              <td style="padding:10px 0 0; font-weight:700; border-top:1px solid #f0f0f2;">Totale</td>
              <td style="padding:10px 0 0; text-align:right; font-weight:800; border-top:1px solid #f0f0f2;">${escapeHtml(
      total
    )}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

  const html = `
    <div style="margin:0; padding:0; background:#f6f6f7;">
      <!-- Preheader -->
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
              <!-- Header brand -->
              <tr>
                <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                  <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#d4af37; font-weight:700;">
                    Q•BEAUTY
                  </div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                    Pagamento ricevuto ✅
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                  <div style="font-family:Arial,sans-serif; color:#121212; line-height:1.55;">
                    <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                      Pagamento confermato ✅
                    </h1>

                    <p style="margin:0 0 12px; font-size:14px;">
                      ${escapeHtml(hello)}<br/>
                      abbiamo ricevuto il pagamento del tuo ordine <strong>${escapeHtml(orderLabel)}</strong>.
                    </p>

                    <div style="margin:14px 0 0; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#666; margin-bottom:6px;">
                        Totale pagato
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:18px; font-weight:800; color:#0b0b0c;">
                        ${escapeHtml(total)}
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:12px; color:#666; margin-top:6px;">
                        Ordine: <strong>${escapeHtml(orderLabel)}</strong>
                      </div>
                    </div>

                    ${itemsTableHtml}
                    ${breakdownHtml}

                    <p style="margin:14px 0 0; font-size:12px; color:#666;">
                      Ti aggiorneremo appena la spedizione sarà affidata al corriere.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                  <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                    <div style="margin:0 0 6px;">Q•BEAUTY</div>
                    <div style="margin:0;">Email automatica legata al tuo ordine.</div>
                  </div>
                </td>
              </tr>

              <!-- Bottom radius -->
              <tr>
                <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
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

  const safeNameRaw = String(name || "").trim().replace(/\s+/g, " ");
  const helloText = safeNameRaw ? `Ciao ${safeNameRaw},` : "Ciao,";
  const helloHtml = safeNameRaw ? `Ciao <strong>${escapeHtml(safeNameRaw)}</strong>,` : "Ciao,";

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

  // Subject più “pulito” e leggibile in inbox
  const subject = `Q•BEAUTY | Istruzioni bonifico — Ordine ${pid}`.trim();
  const preheader = `Completa il pagamento via bonifico (${total}) per l’ordine ${pid}.`;

  const text = `${helloText}

Ecco le istruzioni per completare il pagamento tramite bonifico.

Ordine: ${pid}
Importo: ${total}

Intestatario: ${finalBeneficiary}
IBAN: ${finalIban}
Causale: ${pid}

Ti chiediamo di effettuare il pagamento ${deadlineText}.
Quando riceveremo l’accredito, confermeremo l’ordine e procederemo con la preparazione.

Q•BEAUTY
`;

  const html = `
    <div style="margin:0; padding:0; background:#f6f6f7;">
      <!-- Preheader -->
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
              <!-- Header brand -->
              <tr>
                <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                  <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#d4af37; font-weight:700;">
                    Q•BEAUTY
                  </div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                    Istruzioni bonifico
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                  <div style="font-family:Arial,sans-serif; color:#121212; line-height:1.55;">
                    <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                      Completa il pagamento con bonifico
                    </h1>

                    <p style="margin:0 0 12px; font-size:14px;">
                      ${helloHtml}<br/>
                      trovi qui sotto i dati per effettuare il bonifico. Appena riceveremo l’accredito, confermeremo l’ordine.
                    </p>

                    <!-- Totale / ordine -->
                    <div style="margin:14px 0 0; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:12px; color:#666;">
                        Ordine <strong>${escapeHtml(pid)}</strong>
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:18px; font-weight:800; color:#0b0b0c; margin-top:6px;">
                        Importo: ${escapeHtml(total)}
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:12px; color:#666; margin-top:6px;">
                        Ti chiediamo di effettuare il pagamento <strong>${escapeHtml(deadlineText)}</strong>.
                      </div>
                    </div>

                    <!-- Dati bonifico -->
                    <div style="margin:14px 0 0; padding:12px 14px; background:#ffffff; border:1px solid #ececef; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:700;">
                        Dati per il bonifico
                      </div>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
                        <tr>
                          <td style="padding:6px 0; width:140px; color:#666;">Intestatario</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(finalBeneficiary)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:140px; color:#666;">IBAN</td>
                          <td style="padding:6px 0; text-align:right; font-weight:800; letter-spacing:0.3px;">
                            ${escapeHtml(finalIban)}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:140px; color:#666;">Causale</td>
                          <td style="padding:6px 0; text-align:right; font-weight:800;">
                            ${escapeHtml(pid)}
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top:10px; font-family:Arial,sans-serif; font-size:12px; color:#666;">
                        Suggerimento: copia e incolla <strong>IBAN</strong> e <strong>Causale</strong> per evitare errori.
                      </div>
                    </div>

                    <p style="margin:14px 0 0; font-size:12px; color:#666;">
                      Se hai già effettuato il bonifico, puoi ignorare questo messaggio: aggiorneremo l’ordine non appena vedremo l’accredito.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                  <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                    <div style="margin:0 0 6px;">Q•BEAUTY</div>
                    <div style="margin:0;">Email automatica legata al tuo ordine.</div>
                  </div>
                </td>
              </tr>

              <!-- Bottom radius -->
              <tr>
                <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </div>
  `;

  return sendMail({ to, subject, html, text });
}

//  MAIL RESET PASSWORD
async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!to) throw new Error("Recipient mancante (to)");
  if (!resetUrl) throw new Error("resetUrl mancante (resetUrl)");

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeNameRaw = String(name || "").trim().replace(/\s+/g, " ");
  const helloText = safeNameRaw ? `Ciao ${safeNameRaw},` : "Ciao,";
  const helloHtml = safeNameRaw ? `Ciao <strong>${esc(safeNameRaw)}</strong>,` : "Ciao,";

  const rawUrl = String(resetUrl || "").trim();

  const finalUrl =
    rawUrl && /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : rawUrl
        ? `https://${rawUrl.replace(/^\/+/, "")}`
        : "";

  if (!finalUrl) throw new Error("resetUrl non valido");

  const subject = "Q•BEAUTY | Recupero password 🔐";
  const preheader = "Imposta una nuova password in modo sicuro. Se non sei stato tu, ignora questa email.";

  const text = `${helloText}

Hai richiesto il recupero della password.

Apri questo link per impostarne una nuova:
${finalUrl}

Se non sei stato tu, ignora questa email: non verrà modificato nulla.

Q•BEAUTY
`;

  const html = `
    <div style="margin:0; padding:0; background:#f6f6f7;">
      <!-- Preheader -->
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${esc(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
              <!-- Header brand -->
              <tr>
                <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                  <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#d4af37; font-weight:700;">
                    Q•BEAUTY
                  </div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                    Recupero password 🔐
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                  <div style="font-family:Arial,sans-serif; color:#121212; line-height:1.55;">
                    <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                      Imposta una nuova password
                    </h1>

                    <p style="margin:0 0 12px; font-size:14px;">
                      ${helloHtml}<br/>
                      hai richiesto il recupero della password. Premi il pulsante qui sotto per impostarne una nuova.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:18px 0 10px;">
                      <tr>
                        <td>
                          <a href="${esc(finalUrl)}"
                             style="display:inline-block; background:#d4af37; color:#0b0b0c; text-decoration:none; font-family:Arial, sans-serif;
                                    font-size:14px; font-weight:800; padding:12px 16px; border-radius:12px;">
                            Imposta nuova password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <div style="margin:12px 0 0; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:12px; color:#666; margin-bottom:6px;">
                        Se il pulsante non funziona, copia e incolla questo link nel browser:
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:12px; color:#2b2b2b; word-break:break-all;">
                        ${esc(finalUrl)}
                      </div>
                    </div>

                    <p style="margin:14px 0 0; font-size:12px; color:#666;">
                      Se non sei stato tu a richiedere il recupero, puoi ignorare questa email: non verrà modificato nulla.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                  <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                    <div style="margin:0 0 6px;">Q•BEAUTY</div>
                    <div style="margin:0;">Email automatica legata al tuo account.</div>
                  </div>
                </td>
              </tr>

              <!-- Bottom radius -->
              <tr>
                <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </div>
  `;

  return sendMail({ to, subject, html, text });
}


//MAIL ADMIN NUOVO ORDINE
async function sendAdminNewOrderEmail({ order, user, paymentMethod }) {
  if (!order) throw new Error("Order mancante (order)");

  const coalesceStr = (...vals) => {
    for (const v of vals) {
      const s = String(v || "").trim();
      if (s) return s;
    }
    return "";
  };

  const escapeHtml =
    typeof globalThis.escapeHtml === "function"
      ? globalThis.escapeHtml
      : (s) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

  // Parse destinatari admin inline (niente helper fantasma)
  const adminToRaw = process.env.MAIL_ADMIN_TO;
  const s = String(adminToRaw || "").trim();
  if (!s) return;

  const parts = s
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!parts.length) return;
  const adminTo = parts.length === 1 ? parts[0] : parts;

  const publicId = coalesceStr(order?.publicId);
  const orderId = coalesceStr(order?._id);
  const orderLabel = publicId || (orderId ? `#${orderId.slice(-6)}` : "ordine");

  const userName = coalesceStr(
    user?.name,
    user?.fullName,
    order?.customerName,
    order?.shippingAddress?.name
  );

  const userEmail = coalesceStr(
    user?.email,
    user?.mail,
    order?.userEmail,
    order?.customerEmail,
    order?.shippingAddress?.email
  );

  const userId = coalesceStr(user?.sub, user?._id, order?.userId);

  const items = Array.isArray(order?.items) ? order.items : [];
  const total = formatEURFromCents(order?.totalCents);
  const shippingCents = Number(order?.shippingCents) || 0;
  const shipping = shippingCents === 0 ? "Gratis" : formatEURFromCents(shippingCents);
  const subtotal = formatEURFromCents(order?.subtotalCents);
  const discountCents = Number(order?.discountCents) || 0;
  const discountLabel = String(order?.discountLabel || "").trim();

  const ship = order?.shippingAddress || {};
  const shipName = coalesceStr(ship?.name, order?.customerName, userName);
  const shipSurname = coalesceStr(ship?.surname);
  const shipFullName = [shipName, shipSurname].filter(Boolean).join(" ").trim() || "-";

  const shipEmail = coalesceStr(ship?.email, userEmail);
  const shipPhone = coalesceStr(ship?.phone);

  const shipAddress = coalesceStr(ship?.address);
  const shipStreetNumber = coalesceStr(ship?.streetNumber);
  const shipCity = coalesceStr(ship?.city);
  const shipCap = coalesceStr(ship?.cap);

  const shipTaxCode = coalesceStr(ship?.taxCode, ship?.codiceFiscale, ship?.fiscalCode);

  const normPay = (v) => String(v || "").trim().toLowerCase();
  const providerRaw = normPay(paymentMethod || order?.paymentProvider);

  let paymentProviderLabel = "—";
  if (providerRaw.includes("stripe")) paymentProviderLabel = "Stripe";
  else if (providerRaw.includes("bank") || providerRaw.includes("bonifico")) paymentProviderLabel = "Bonifico";
  else if (order?.stripeCheckoutSessionId || order?.stripePaymentIntentId) paymentProviderLabel = "Stripe";

  const statusRaw = String(order?.status || "").trim();
  const paidStatuses = new Set(["paid", "processing", "shipped", "completed"]);
  const paymentStateLabel = paidStatuses.has(statusRaw)
    ? "Pagato"
    : statusRaw === "pending_payment"
      ? "In attesa pagamento"
      : statusRaw === "cancelled"
        ? "Annullato"
        : statusRaw === "refunded"
          ? "Rimborsato"
          : statusRaw || "—";

  const subject = `NUOVO ORDINE ${orderLabel} — ${total} (${paymentProviderLabel})`;
  const preheader = `Nuovo ordine ${orderLabel} • ${total} • ${paymentProviderLabel} • ${paymentStateLabel}`;

  const text = `Nuovo ordine ricevuto 

Ordine: ${orderLabel}
Totale: ${total}
Pagamento: ${paymentStateLabel}
Metodo: ${paymentProviderLabel}

Cliente:
- Nome: ${userName || "-"}
- Email: ${userEmail || "-"}
- UserId: ${userId || "-"}

Spedizione / Fatturazione:
- Nome: ${shipFullName}
- Email: ${shipEmail || "-"}
- Telefono: ${shipPhone || "-"}
- Indirizzo: ${shipAddress}${shipStreetNumber ? `, ${shipStreetNumber}` : ""}
- Città: ${shipCity || "-"} (CAP: ${shipCap || "-"})
- CF/P.IVA: ${shipTaxCode || "-"}

Articoli:
${items.length ? buildItemsText(items) : "- (nessun articolo in payload)"}

Riepilogo:
- Subtotale: ${subtotal}
${discountCents > 0 ? `- Sconto${discountLabel ? ` (${discountLabel})` : ""}: -${formatEURFromCents(discountCents)}` : ""}
- Spedizione: ${shipping}
- Totale: ${total}
`;

  const itemsTableHtml = items.length
    ? `
      <div style="margin-top:14px; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
        <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:800;">
          Articoli
        </div>

        <table role="presentation" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px 0; border-bottom:1px solid #ececef; color:#666; font-weight:700;">Prodotto</th>
              <th style="text-align:center; padding:8px 0; border-bottom:1px solid #ececef; color:#666; font-weight:700; width:60px;">Qta</th>
              <th style="text-align:right; padding:8px 0; border-bottom:1px solid #ececef; color:#666; font-weight:700; width:110px;">Totale</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsRowsHtml(items)}
          </tbody>
        </table>
      </div>
    `
    : `
      <div style="margin-top:14px; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px; font-family:Arial,sans-serif; font-size:13px; color:#666;">
        (Nessun articolo in payload)
      </div>
    `;

  const breakdownHtml = `
    <div style="margin-top:14px; padding:12px 14px; background:#ffffff; border:1px solid #ececef; border-radius:12px;">
      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:800;">
        Riepilogo
      </div>

      <table role="presentation" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
        <tbody>
          <tr>
            <td style="padding:6px 0; color:#666;">Subtotale</td>
            <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(subtotal)}</td>
          </tr>

          ${discountCents > 0
      ? `<tr>
                   <td style="padding:6px 0; color:#666;">Sconto${discountLabel ? ` (${escapeHtml(discountLabel)})` : ""}</td>
                   <td style="padding:6px 0; text-align:right; font-weight:700;">- ${escapeHtml(formatEURFromCents(discountCents))}</td>
                 </tr>`
      : ""
    }

          <tr>
            <td style="padding:6px 0; color:#666;">Spedizione</td>
            <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(shipping)}</td>
          </tr>

          <tr>
            <td style="padding:10px 0 0; font-weight:800; border-top:1px solid #f0f0f2;">Totale</td>
            <td style="padding:10px 0 0; text-align:right; font-weight:900; border-top:1px solid #f0f0f2;">${escapeHtml(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const html = `
    <div style="margin:0; padding:0; background:#f6f6f7;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:640px;">
              <tr>
                <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                  <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#d4af37; font-weight:800;">
                    Q•BEAUTY • ADMIN
                  </div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                    Nuovo ordine ricevuto ✅
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                  <div style="font-family:Arial,sans-serif; color:#121212; line-height:1.55;">
                    <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                      Ordine ${escapeHtml(orderLabel)}
                    </h1>

                    <div style="margin:12px 0 0; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                      <table role="presentation" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px;">
                        <tr>
                          <td style="padding:6px 0; color:#666;">Totale</td>
                          <td style="padding:6px 0; text-align:right; font-weight:900; color:#0b0b0c;">${escapeHtml(total)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; color:#666;">Pagamento</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(paymentStateLabel)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; color:#666;">Metodo</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(paymentProviderLabel)}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin-top:14px; padding:12px 14px; background:#ffffff; border:1px solid #ececef; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:800;">
                        Cliente
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
                        <div><strong>Nome:</strong> ${escapeHtml(userName || "-")}</div>
                        <div><strong>Email:</strong> ${userEmail
      ? `<a href="mailto:${escapeHtml(userEmail)}" style="color:#0b0b0c; text-decoration:underline;">${escapeHtml(userEmail)}</a>`
      : escapeHtml("-")
    }</div>
                        <div><strong>UserId:</strong> <span style="color:#666;">${escapeHtml(userId || "-")}</span></div>
                      </div>
                    </div>

                    <div style="margin-top:14px; padding:12px 14px; background:#ffffff; border:1px solid #ececef; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:10px; font-weight:800;">
                        Spedizione / Fatturazione
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
                        <div><strong>Nome:</strong> ${escapeHtml(shipFullName)}</div>
                        <div><strong>Email:</strong> ${shipEmail
      ? `<a href="mailto:${escapeHtml(shipEmail)}" style="color:#0b0b0c; text-decoration:underline;">${escapeHtml(shipEmail)}</a>`
      : escapeHtml("-")
    }</div>
                        <div><strong>Telefono:</strong> ${shipPhone
      ? `<a href="tel:${escapeHtml(shipPhone)}" style="color:#0b0b0c; text-decoration:underline;">${escapeHtml(shipPhone)}</a>`
      : escapeHtml("-")
    }</div>
                        <div><strong>Indirizzo:</strong> ${escapeHtml(shipAddress || "-")}${shipStreetNumber ? `, ${escapeHtml(shipStreetNumber)}` : ""}</div>
                        <div><strong>Città:</strong> ${escapeHtml(shipCity || "-")} <span style="color:#666;">(CAP: ${escapeHtml(shipCap || "-")})</span></div>
                        <div><strong>CF/P.IVA:</strong> ${escapeHtml(shipTaxCode || "-")}</div>
                      </div>
                    </div>

                    ${itemsTableHtml}
                    ${breakdownHtml}
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                  <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                    <div style="margin:0;">Q•BEAUTY • Admin notification</div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendMail({ to: adminTo, subject, html, text });
}

//MAIL UTENTE CON 5% DI SCONTO PER RECENSIONE
async function sendReviewRewardEmail({ to, name, couponCode, percent = 5 }) {
  if (!to) throw new Error("Recipient mancante (to)");
  if (!couponCode) throw new Error("couponCode mancante");

  const safeNameRaw = String(name || "").trim().replace(/\s+/g, " ");

  const helloText = safeNameRaw ? `Ciao ${safeNameRaw},` : "Ciao,";
  const helloHtml = safeNameRaw ? `Ciao <strong>${escapeHtml(safeNameRaw)}</strong>,` : "Ciao,";

  const baseUrl = String(process.env.PUBLIC_SITE_URL || "https://qbeautyshop.it")
    .trim()
    .replace(/\/+$/, "");
  const shopUrl = `${baseUrl}/shop`;

  const safeCode = String(couponCode || "").trim().toUpperCase();
  const safePercent = Number(percent) || 5;

  const subject = `Q•BEAUTY | Grazie per la tua recensione ✨`;
  const preheader = `La tua recensione è stata approvata. Ecco il tuo codice sconto del ${safePercent}%.`;

  const text = `${helloText}

Grazie! La tua recensione è stata approvata ✅

Come promesso, ecco il tuo codice sconto del ${safePercent}%:

${safeCode}

Puoi usarlo sul prossimo acquisto nello shop Q•BEAUTY.
Il codice è valido per 30 giorni e poi scadrà automaticamente.

Entra qui:
${shopUrl}

A presto,
Q•BEAUTY
`;

  const html = `
    <div style="margin:0; padding:0; background:#f6f6f7;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
              <tr>
                <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                  <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#d4af37; font-weight:700;">
                    Q•BEAUTY
                  </div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                    Grazie per la tua recensione ✨
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                  <div style="font-family:Arial,sans-serif; color:#121212; line-height:1.55;">
                    <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                      Recensione approvata ✅
                    </h1>

                    <p style="margin:0 0 12px; font-size:14px;">
                      ${helloHtml}<br/>
                      grazie per aver condiviso la tua esperienza con Q•BEAUTY.
                    </p>

                    <div style="margin:14px 0 0; padding:14px 16px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#666; margin-bottom:6px;">
                        Il tuo codice sconto
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:24px; font-weight:900; letter-spacing:1px; color:#0b0b0c;">
                        ${escapeHtml(safeCode)}
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:12px; color:#666; margin-top:8px;">
                        Valore: <strong>${safePercent}%</strong> di sconto
                      </div>
                    </div>

                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:18px 0 10px;">
                      <tr>
                        <td>
                          <a href="${escapeHtml(shopUrl)}"
                             style="display:inline-block; background:#d4af37; color:#0b0b0c; text-decoration:none; font-family:Arial, sans-serif;
                                    font-size:14px; font-weight:800; padding:12px 16px; border-radius:12px;">
                            Vai allo shop
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:14px 0 0; font-size:12px; color:#666;">
                      Conserva questo codice e inseriscilo al checkout sul tuo prossimo ordine.
                      È valido per <strong>30 giorni</strong> e poi scadrà automaticamente.
                    </p>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                  <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                    <div style="margin:0 0 6px;">Q•BEAUTY</div>
                    <div style="margin:0;">Email automatica legata alla tua recensione approvata.</div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendMail({ to, subject, html, text });
}

//MAIL ADMIN CREATA NUOVA RECENSIONE
async function sendAdminNewReviewEmail({ review }) {
  if (!review) throw new Error("Review mancante (review)");

  const coalesceStr = (...vals) => {
    for (const v of vals) {
      const s = String(v || "").trim();
      if (s) return s;
    }
    return "";
  };

  const adminToRaw = process.env.MAIL_ADMIN_TO;
  const s = String(adminToRaw || "").trim();
  if (!s) return;

  const parts = s
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!parts.length) return;
  const adminTo = parts.length === 1 ? parts[0] : parts;

  const name = coalesceStr(review?.name) || "Utente";
  const email = coalesceStr(review?.email) || "-";
  const role = coalesceStr(review?.role) || "-";
  const city = coalesceStr(review?.city) || "-";
  const text = coalesceStr(review?.text) || "-";
  const rating = Number(review?.rating) || 0;
  const createdAt = review?.createdAt
    ? new Date(review.createdAt).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "-";

  const stars = rating > 0 ? `${rating}/5` : "—";

  const subject = `NUOVA RECENSIONE IN ATTESA — ${name} (${stars})`;
  const preheader = `Una nuova recensione è in attesa di approvazione nel pannello admin.`;

  const textBody = `Nuova recensione in attesa di approvazione

Nome: ${name}
Email: ${email}
Ruolo: ${role}
Città: ${city}
Valutazione: ${stars}
Data: ${createdAt}

Testo:
${text}
`;

  const html = `
    <div style="margin:0; padding:0; background:#f6f6f7;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#f6f6f7; padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; max-width:560px;">
              <tr>
                <td style="background:#0b0b0c; border-radius:18px 18px 0 0; padding:18px 22px; text-align:left;">
                  <div style="font-family:Arial, sans-serif; font-size:16px; letter-spacing:0.6px; color:#d4af37; font-weight:700;">
                    Q•BEAUTY • ADMIN
                  </div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#c9c9c9; margin-top:4px;">
                    Nuova recensione in attesa
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; padding:22px; border-left:1px solid #ececef; border-right:1px solid #ececef;">
                  <div style="font-family:Arial,sans-serif; color:#121212; line-height:1.55;">
                    <h1 style="margin:0 0 10px; font-size:20px; letter-spacing:0.2px;">
                      Nuova recensione da approvare
                    </h1>

                    <div style="margin:14px 0 0; padding:12px 14px; background:#fafafc; border:1px solid #eeeeF3; border-radius:12px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b;">
                        <tr>
                          <td style="padding:6px 0; width:120px; color:#666;">Nome</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(name)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:120px; color:#666;">Email</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(email)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:120px; color:#666;">Ruolo</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(role)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:120px; color:#666;">Città</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(city)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:120px; color:#666;">Valutazione</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(stars)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; width:120px; color:#666;">Data</td>
                          <td style="padding:6px 0; text-align:right; font-weight:700;">${escapeHtml(createdAt)}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin:14px 0 0; padding:12px 14px; background:#ffffff; border:1px solid #ececef; border-radius:12px;">
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; margin-bottom:8px; font-weight:700;">
                        Testo recensione
                      </div>
                      <div style="font-family:Arial,sans-serif; font-size:13px; color:#2b2b2b; white-space:pre-wrap;">
                        ${escapeHtml(text)}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; border-left:1px solid #ececef; border-right:1px solid #ececef; padding:0 22px 18px;">
                  <div style="height:1px; background:#f0f0f2; margin:10px 0 14px;"></div>
                  <div style="font-family:Arial, sans-serif; font-size:12px; color:#777; line-height:1.45;">
                    <div style="margin:0;">Q•BEAUTY • Admin notification</div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff; border-radius:0 0 18px 18px; border:1px solid #ececef; border-top:none; height:12px;"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendMail({ to: adminTo, subject, html, text: textBody });
}


module.exports = {
  sendMail,
  verifySmtp,
  sendWelcomeEmail,
  sendShipmentEmail,
  sendOrderPaymentConfirmedEmail,
  sendBankTransferInstructionsEmail,
  sendPasswordResetEmail,
  sendAdminNewOrderEmail,
  sendReviewRewardEmail,
  sendAdminNewReviewEmail,
};



