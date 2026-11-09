
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import WithdrawalForm from "./WithdrawalForm";
import Seo from "./components/Seo";
import "./PrivacyPolicy.css";

export default function ShippingReturnsPolicy() {
    const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const fromCheckout = searchParams.get("from") === "checkout";

    const returnTo = location.state?.returnTo === "/shop" ? "/shop" : "/home";

    return (
        <main className="policy">
            <Seo
                title="Spedizioni, resi e diritto di recesso"
                description="Consulta le condizioni Q•BEAUTY: costi e tempi di spedizione, restituzione dei prodotti, rimborsi e modalità per esercitare il diritto di recesso."
                canonical="/spedizioni-resi"
            />

            {fromCheckout ? (
                <div style={{ marginBottom: 24 }}>
                    <button
                        type="button"
                        onClick={() => window.close()}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 16px",
                            border: "1px solid rgba(222,190,104,.5)",
                            borderRadius: 8,
                            background: "transparent",
                            color: "#debe68",
                            font: "inherit",
                            cursor: "pointer",
                        }}
                    >
                        <span aria-hidden="true">←</span>
                        Chiudi e torna al checkout
                    </button>

                    <p style={{ marginTop: 10, fontSize: 13 }}>
                        Il tuo checkout è rimasto aperto nell'altra scheda.
                        Se questa scheda non si chiude automaticamente,
                        chiudila manualmente per tornare all'ordine.
                    </p>
                </div>
            ) : (
                <Link
                    to={returnTo}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 24,
                        padding: "10px 16px",
                        border: "1px solid rgba(222,190,104,.5)",
                        borderRadius: 8,
                        color: "#debe68",
                        textDecoration: "none",
                        font: "inherit",
                    }}
                >
                    <span aria-hidden="true">←</span>
                    {returnTo === "/shop" ? "Torna allo shop" : "Torna al sito"}
                </Link>
            )}

            <h1>Spedizioni, resi e diritto di recesso</h1>

            <p className="policy__meta">
                <em>Ultimo aggiornamento: 02/11/2026</em>
                <br />
                Sito: <strong>www.qbeautyshop.it</strong>
            </p>

            <p>
                La presente informativa descrive le condizioni di spedizione,
                le modalità di restituzione dei prodotti e i diritti dei
                clienti che acquistano sul sito Q•BEAUTY.
            </p>

            <h2>1) Informazioni sul venditore</h2>
            <p>
                <strong>Elena Santucci – Nail Educator</strong>
                <br />
                Via del Fienile 2, 43037 Lesignano de’ Bagni (PR), Italia
                <br />
                P.IVA: <strong>03065510343</strong>
                <br />
                Email assistenza:{" "}
                <a href="mailto:assistenza@qbeautyshop.it">
                    assistenza@qbeautyshop.it
                </a>
            </p>

            <h2>2) Spedizioni e consegne</h2>
            <p>
                Q•BEAUTY effettua spedizioni sul territorio italiano
                tramite corriere GLS.
            </p>

            <ul>
                <li>
                    <strong>Costo di spedizione:</strong> 7,00 €.
                </li>
                <li>
                    <strong>Spedizione gratuita:</strong> per ordini di almeno
                    120,00 €, calcolati sul totale dei prodotti dopo
                    l'applicazione degli sconti.
                </li>
                <li>
                    <strong>Preparazione dell'ordine:</strong> indicativamente
                    1 giorno lavorativo.
                </li>
                <li>
                    <strong>Consegna:</strong> indicativamente 2–4 giorni
                    lavorativi dall'affidamento al corriere.
                </li>
            </ul>

            <p>
                I tempi indicati sono stime e possono subire variazioni.
                Restano fermi i diritti del consumatore in caso di
                mancata consegna nei termini previsti dalla legge.
            </p>

            <p>
                Per spedizioni al di fuori dell'Italia è necessario
                contattare preventivamente l'assistenza. Gli ordini
                internazionali non possono essere completati direttamente
                attraverso il checkout del sito.
            </p>

            <h2>3) Diritto di recesso dei consumatori</h2>
            <p>
                Ai sensi degli articoli 52 e seguenti del D.Lgs. 206/2005,
                il consumatore che effettua un acquisto a distanza ha
                normalmente diritto di recedere dal contratto entro
                <strong> 14 giorni</strong>, senza fornire motivazioni,
                salvo le eccezioni previste dalla legge.
            </p>

            <p>
                Per la vendita di beni, il termine decorre dal giorno
                in cui il consumatore, o un terzo da lui designato
                diverso dal vettore, acquisisce il possesso fisico
                dei prodotti. In caso di beni consegnati separatamente
                nell'ambito dello stesso ordine, il termine decorre
                dalla consegna dell'ultimo bene.
            </p>

            <h2>4) Come esercitare il recesso</h2>
            <p>
                Per esercitare il diritto di recesso, il consumatore
                deve comunicare la propria decisione attraverso una
                dichiarazione esplicita, prima della scadenza del termine.
            </p>

            <p>
                La comunicazione può essere inviata a{" "}
                <a href="mailto:assistenza@qbeautyshop.it">
                    assistenza@qbeautyshop.it
                </a>.
            </p>

            <p>
                È utile indicare il nome dell'acquirente, il numero
                dell'ordine e i prodotti interessati dal recesso.
                Non è necessario specificare il motivo.
            </p>

            <p>
                Il consumatore può utilizzare anche il modulo tipo
                di recesso previsto dal Codice del consumo, senza
                esservi obbligato.{" "}
                <a
                    href="/QBEAUTY_modulo_tipo_recesso_aggiornato.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                >
                    Scarica il modulo tipo di recesso (PDF)
                </a>
            </p>


            <p>
                Puoi esercitare il diritto di recesso anche direttamente
                online, utilizzando il modulo disponibile qui sotto.
            </p>

            <div
                style={{
                    margin: "24px auto 32px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 20,
                }}
            >
                <button
                    type="button"
                    onClick={() => setShowWithdrawalForm((current) => !current)}
                    aria-expanded={showWithdrawalForm}
                    aria-controls="withdrawal-form-container"
                    style={{
                        background: "#debe68",
                        color: "#181818",
                        border: "none",
                        borderRadius: 10,
                        padding: "13px 22px",
                        font: "inherit",
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    {showWithdrawalForm
                        ? "Chiudi il modulo di recesso"
                        : "Esercita il diritto di recesso"}
                </button>

                {showWithdrawalForm && (
                    <div
                        id="withdrawal-form-container"
                        style={{
                            width: "100%",
                            padding: "20px",
                            border: "1px solid rgba(212,175,55,.3)",
                            borderRadius: 12,
                            background: "rgba(0,0,0,.2)",
                        }}
                    >
                        <WithdrawalForm />
                    </div>
                )}
            </div>


            <h2>5) Restituzione dei prodotti</h2>
            <p>
                Dopo aver comunicato il recesso, il consumatore deve
                restituire i beni senza indebito ritardo e comunque
                entro 14 giorni dalla comunicazione.
                Il termine è rispettato se i beni vengono spediti
                prima della sua scadenza.
            </p>

            <p>
                <strong>Indirizzo per la restituzione:</strong>
                <br />
                Q•BEAUTY – Elena Santucci
                <br />
                Via del Fienile 2
                <br />
                43037 Lesignano de’ Bagni (PR)
                <br />
                Italia
            </p>

            <p>
                Il consumatore può scegliere autonomamente il corriere.
                <strong> Le spese dirette di restituzione sono a suo carico</strong>,
                salvo i casi in cui la legge preveda diversamente.
            </p>

            <p>
                Si consiglia di utilizzare un servizio di spedizione
                tracciabile e un imballaggio adeguato.
            </p>

            <h2>6) Condizioni dei prodotti restituiti</h2>
            <p>
                Il consumatore può manipolare i prodotti nella misura
                necessaria per stabilirne la natura, le caratteristiche
                e il funzionamento.
            </p>

            <p>
                Qualora il prodotto subisca una diminuzione di valore
                derivante da manipolazioni diverse da quelle necessarie,
                il consumatore può esserne responsabile nei limiti
                previsti dall'articolo 57 del Codice del consumo.
            </p>

            <p>
                L'apertura di un prodotto cosmetico non comporta
                automaticamente la perdita del diritto di recesso.
                Le eccezioni previste per i beni sigillati non idonei
                alla restituzione per motivi igienici o sanitari
                si applicano soltanto quando ne ricorrono
                effettivamente i presupposti di legge.
            </p>

            <h2>7) Rimborsi</h2>
            <p>
                In caso di valido esercizio del recesso, Q•BEAUTY
                rimborserà i pagamenti dovuti ai sensi dell'articolo
                56 del Codice del consumo, comprese, ove previste,
                le spese della consegna iniziale standard.
            </p>

            <p>
                Non saranno rimborsati gli eventuali costi supplementari
                derivanti dalla scelta di una modalità di consegna
                più costosa rispetto a quella standard proposta.
            </p>

            <p>
                Il rimborso sarà effettuato senza indebito ritardo
                e comunque entro 14 giorni dalla data in cui
                Q•BEAUTY è stata informata della decisione di recedere.
            </p>

            <p>
                Q•BEAUTY potrà sospendere il rimborso fino al ricevimento
                dei beni oppure fino alla dimostrazione dell'avvenuta
                spedizione da parte del consumatore, se precedente.
            </p>

            <p>
                Il rimborso sarà effettuato mediante lo stesso mezzo
                di pagamento utilizzato per l'acquisto, salvo diverso
                accordo espresso con il consumatore e senza costi
                aggiuntivi a suo carico.
            </p>

            <p>
                In caso di recesso parziale, le spese di consegna
                iniziali saranno rimborsate nella misura eventualmente
                dovuta secondo la normativa applicabile.
            </p>

            <h2>8) Prodotti danneggiati o non conformi</h2>
            <p>
                Se un prodotto viene consegnato danneggiato, risulta
                difettoso oppure non corrisponde a quanto ordinato,
                il cliente è invitato a contattare l'assistenza:
            </p>

            <p>
                <a href="mailto:assistenza@qbeautyshop.it">
                    assistenza@qbeautyshop.it
                </a>
            </p>

            <p>
                Per agevolare la gestione della richiesta si consiglia
                di indicare il numero dell'ordine e allegare, ove
                possibile, fotografie del prodotto e dell'imballaggio.
            </p>

            <p>
                Q•BEAUTY esaminerà la segnalazione nel rispetto
                della garanzia legale di conformità.
                Nei casi previsti dalla legge, i rimedi possono
                comprendere la sostituzione gratuita del prodotto,
                la riduzione del prezzo o la risoluzione del contratto
                con relativo rimborso.
            </p>

            <p>
                Qualora il cliente preferisca conservare un prodotto
                danneggiato, potrà essere concordata una riduzione
                del prezzo, quando applicabile.
                Questa possibilità non limita i diritti riconosciuti
                dalla normativa vigente.
            </p>

            <h2>9) Acquisti professionali e partita IVA</h2>
            <p>
                Il diritto di recesso previsto dal Codice del consumo
                si applica agli acquisti effettuati in qualità
                di consumatore.
            </p>

            <p>
                Per gli acquisti effettuati nell'esercizio di
                un'attività imprenditoriale, commerciale, artigianale
                o professionale, Q•BEAUTY non prevede restituzioni
                volontarie per semplice ripensamento.
            </p>

            <p>
                Restano fermi i diritti e le garanzie applicabili
                agli acquisti professionali secondo la normativa vigente.
            </p>

            <h2>10) Assistenza clienti</h2>
            <p>
                Per informazioni su spedizioni, consegne, recesso,
                restituzioni e prodotti non conformi, contattare:
            </p>

            <p>
                <a href="mailto:assistenza@qbeautyshop.it">
                    assistenza@qbeautyshop.it
                </a>
            </p>
        </main>
    );
}
