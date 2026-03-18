# Q-BEAUTY - Deploy Checklist

## 1. Controlli prima del deploy

### Codice
- [ ] frontend compilabile senza errori
- [ ] backend avviabile senza errori
- [ ] nessun file inutile o vecchio rimasto nel progetto
- [ ] vecchie rotte eliminate o reindirizzate correttamente
- [ ] pagina 404 presente e funzionante

### Git
- [ ] modifiche controllate
- [ ] commit fatti
- [ ] push su repository eseguito
- [ ] branch corretto

---

## 2. Frontend - checklist deploy

### Build
- [ ] build locale ok
- [ ] nessun errore console bloccante
- [ ] import corretti
- [ ] immagini e asset caricati correttamente
- [ ] rotte frontend corrette

### Variabili ambiente frontend
- [ ] `VITE_API_URL` corretta
- [ ] `VITE_SITE_URL` corretta

### SEO frontend
- [ ] homepage `/` con SEO corretto
- [ ] `/shop` con SEO corretto
- [ ] `/shop/product/:id` con SEO dinamico
- [ ] pagine operative in `noindex`
- [ ] 404 in `noindex`
- [ ] canonical corretti
- [ ] h1 presenti e sensati

### UI / pagine principali
- [ ] homepage vetrina ok
- [ ] homepage shop ok
- [ ] dettaglio prodotto ok
- [ ] carrello ok
- [ ] checkout ok
- [ ] login ok
- [ ] register ok
- [ ] reset password ok
- [ ] ordini utente ok
- [ ] esito ordine ok
- [ ] admin frontend ok

---

## 3. Backend - checklist deploy

### Avvio backend
- [ ] server parte correttamente
- [ ] connessione MongoDB ok
- [ ] nessun errore grave nei log
- [ ] rotte API rispondono correttamente

### Variabili ambiente backend
- [ ] `MONGODB_URI` corretta
- [ ] `JWT_SECRET` presente
- [ ] `STRIPE_SECRET_KEY` presente
- [ ] `STRIPE_WEBHOOK_SECRET` presente
- [ ] `FRONTEND_URL` corretta
- [ ] `CORS_ORIGIN` corretto
- [ ] variabili provider email corrette

### Funzioni backend
- [ ] auth ok
- [ ] prodotti ok
- [ ] ordini ok
- [ ] coupon ok
- [ ] indirizzi ok
- [ ] admin ok
- [ ] webhook Stripe ok
- [ ] invio email ok

---

## 4. Dominio e DNS

### Dominio
- [ ] dominio corretto: `qbeautyshop.it`
- [ ] SSL attivo
- [ ] dominio raggiungibile da browser

### DNS
- [ ] nameserver live corretti
- [ ] record DNS modificati solo in Cloudflare
- [ ] record Search Console non rimosso
- [ ] eventuali record mail corretti
- [ ] eventuali record per frontend/backend corretti

### Controlli utili
- [ ] `dig +short NS qbeautyshop.it`
- [ ] `dig +short TXT qbeautyshop.it`
- [ ] `dig +short A qbeautyshop.it`
- [ ] `dig +short CNAME www.qbeautyshop.it`

---

## 5. Collegamento dominio

### Frontend
- [ ] `https://qbeautyshop.it` apre il frontend giusto
- [ ] `https://www.qbeautyshop.it` gestito correttamente
- [ ] nessun dominio vecchio rimasto come principale

### Backend
- [ ] backend raggiungibile dal frontend
- [ ] richieste API ok da produzione
- [ ] nessun problema CORS

---

## 6. Ecommerce - test completi

### Catalogo
- [ ] lista prodotti ok
- [ ] immagini prodotto ok
- [ ] prezzi corretti
- [ ] prezzi P.IVA corretti
- [ ] badge corretti
- [ ] stock corretto

### Carrello
- [ ] aggiunta al carrello ok
- [ ] incremento quantità ok
- [ ] decremento quantità ok
- [ ] rimozione prodotto ok
- [ ] coupon ok
- [ ] note ordine ok
- [ ] totale corretto
- [ ] sconti corretti
- [ ] spedizione corretta

### Checkout
- [ ] login richiesto correttamente
- [ ] indirizzi caricati correttamente
- [ ] nuovo indirizzo ok
- [ ] indirizzo salvato ok
- [ ] checkout privato ok
- [ ] checkout P.IVA ok
- [ ] fatturazione privata ok
- [ ] validazione codice fiscale ok
- [ ] nessun campo rotto o incoerente

### Ordine
- [ ] creazione ordine ok
- [ ] publicId ordine corretto
- [ ] totale ordine corretto
- [ ] stato iniziale corretto

---

## 7. Pagamenti

### Stripe
- [ ] sessione checkout Stripe creata correttamente
- [ ] redirect a Stripe ok
- [ ] pagamento completato ok
- [ ] ritorno su order success ok
- [ ] webhook riceve evento
- [ ] ordine passa a pagato
- [ ] mail conferma pagamento inviata

### Bonifico
- [ ] ordine con bonifico creato correttamente
- [ ] pagina esito bonifico ok
- [ ] istruzioni bonifico inviate via email
- [ ] reinvio istruzioni bonifico ok
- [ ] stato ordine coerente

---

## 8. Email

### Caselle dominio
- [ ] caselle Aruba accessibili
- [ ] mittenti corretti
- [ ] dominio email corretto

### Email automatiche
- [ ] conferma ordine ok
- [ ] conferma pagamento ok
- [ ] spedizione ok
- [ ] bonifico ok
- [ ] reset password ok

### Deliverability
- [ ] SPF corretto
- [ ] DKIM corretto
- [ ] DMARC corretto
- [ ] mail non finiscono in spam troppo facilmente

---

## 9. Admin

### Accesso admin
- [ ] login admin ok
- [ ] protezione rotte admin ok

### Prodotti
- [ ] creazione prodotto ok
- [ ] modifica prodotto ok
- [ ] immagini prodotto ok
- [ ] stock ok
- [ ] badge ok
- [ ] prezzo / compareAt ok

### Ordini
- [ ] lista ordini ok
- [ ] dettaglio ordine ok
- [ ] cambio stato ok
- [ ] tracking ok
- [ ] annullamento ordine ok
- [ ] restock ok dove previsto

### Coupon
- [ ] creazione coupon ok
- [ ] validazione coupon ok
- [ ] utilizzo coupon ok
- [ ] blocco riuso coupon ok

### Reviews
- [ ] sezione review ok
- [ ] gestione review ok

---

## 10. SEO e indicizzazione

### Tecnico
- [ ] Search Console verificata
- [ ] dominio property corretto
- [ ] `robots.txt` raggiungibile
- [ ] `sitemap.xml` raggiungibile
- [ ] sitemap inviata in Search Console
- [ ] nessuna pagina tecnica importante indicizzabile per errore

### Pagine importanti
- [ ] homepage `/`
- [ ] `/shop`
- [ ] pagine prodotto
- [ ] canonical corretti
- [ ] title corretti
- [ ] description corrette

### Noindex
- [ ] login
- [ ] register
- [ ] forgot password
- [ ] reset password
- [ ] cart
- [ ] checkout
- [ ] orders
- [ ] order success
- [ ] 404

---

## 11. Performance e controllo qualità

### Base
- [ ] sito carica correttamente da desktop
- [ ] sito carica correttamente da mobile
- [ ] nessuna immagine rotta
- [ ] nessun layout rotto evidente
- [ ] nessun blocco in console grave

### Verifiche utili
- [ ] homepage veloce
- [ ] shop veloce
- [ ] dettaglio prodotto veloce
- [ ] checkout usabile
- [ ] niente errori JS bloccanti

---

## 12. Dopo il go-live

### Subito dopo la pubblicazione
- [ ] aprire sito dal dominio vero
- [ ] testare homepage
- [ ] testare shop
- [ ] testare una scheda prodotto
- [ ] testare login
- [ ] testare checkout
- [ ] testare un pagamento reale o test controllato
- [ ] testare bonifico
- [ ] testare area ordini
- [ ] testare admin

### Entro 24-72 ore
- [ ] controllare Search Console
- [ ] controllare indicizzazione
- [ ] controllare log Render
- [ ] controllare Stripe
- [ ] controllare email reali ricevute
- [ ] controllare eventuali errori utente

---

## 13. Regole da ricordare
- Non modificare DNS live da Aruba
- I DNS live si modificano in Cloudflare
- Non rimuovere il TXT di verifica Search Console
- Non fare deploy senza controllare env e log
- Non fidarsi di un pannello DNS senza verificare con `dig`

---

## 14. Stato finale deploy
Compilare prima del go-live:

- Data controllo finale:
- Frontend pronto: [ ]
- Backend pronto: [ ]
- Dominio pronto: [ ]
- DNS pronti: [ ]
- Stripe pronto: [ ]
- Email pronte: [ ]
- SEO pronto: [ ]
- Admin pronto: [ ]
- Go-live approvato: [ ]