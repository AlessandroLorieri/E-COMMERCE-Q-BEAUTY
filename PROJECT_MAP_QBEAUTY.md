# Q-BEAUTY - Mappa operativa

## 1. Cos'è
Q-BEAUTY è composto da:
- sito vetrina
- ecommerce shop
- pannello admin
- backend API

## 2. Struttura progetto
- `FRONTEND Q-BEAUTY` = frontend React + Vite
- `BACKEND Q-BEAUTY` = backend Node + Express
- `PROJECT_MAP_QBEAUTY.md` = mappa operativa del progetto

## 3. Servizi principali
- Dominio registrato: Aruba
- DNS live: Cloudflare
- Frontend deploy: Vercel
- Backend deploy: Render
- Database: MongoDB
- Pagamenti: Stripe
- SEO: Google Search Console

## 4. Dove si fa cosa
- Aruba = rinnovo dominio + caselle email
- Cloudflare = DNS live del dominio
- Vercel = deploy frontend
- Render = deploy backend
- MongoDB = database
- Stripe = pagamenti
- Google Search Console = SEO / indicizzazione

## 5. Dominio e DNS
- Dominio principale: `qbeautyshop.it`
- Registrar: Aruba
- Nameserver live:
  - `albert.ns.cloudflare.com`
  - `michelle.ns.cloudflare.com`
- Regola importante: i DNS live si modificano in Cloudflare, non in Aruba
- Search Console: property dominio `qbeautyshop.it` verificata

## 6. Deploy

### Frontend
- Servizio: Vercel
- Stack: React + Vite
- Qui si gestiscono:
  - deploy frontend
  - env frontend
  - dominio custom frontend

### Backend
- Servizio: Render
- Stack: Node.js + Express
- Qui si gestiscono:
  - deploy backend
  - log backend
  - env backend

## 7. Database
- Servizio: MongoDB
- Uso:
  - utenti
  - prodotti
  - ordini
  - coupon
  - indirizzi
  - recensioni
  - contatori ordini
  - impostazioni spedizione

## 8. Pagamenti
- Servizio: Stripe
- Uso:
  - checkout online
  - sessioni pagamento
  - webhook
  - aggiornamento stato ordini

### Nota utile
Per reinviare le istruzioni bonifico:
- endpoint: `POST /api/payments/bank-transfer/send-instructions`
- body:
```json
{ "orderId": "...", "force": true }
```

## 9. Email

### Caselle dominio
- Gestite su Aruba

### Email applicative / transazionali
- Gestite dal backend
- Invio via configurazione mail del backend
- Usate per:
  - benvenuto
  - conferma ordine / pagamento
  - spedizione
  - bonifico
  - reset password
  - recensioni

## 10. SEO
- Search Console verificata per `qbeautyshop.it`
- Componente SEO creato nel frontend
- Product detail con meta dinamici
- Alcune pagine operative sono da tenere fuori indice

### Pagine da non indicizzare
- `/shop/login`
- `/shop/register`
- `/shop/forgot-password`
- `/shop/reset-password`
- `/shop/checkout`
- `/shop/orders`
- `/shop/order-success/:id`

## 11. Routing frontend principale

### Vetrina
- `/` = homepage vetrina

### Shop
- `/shop`
- `/shop/product/:id`
- `/shop/cart`
- `/shop/checkout`
- `/shop/orders`
- `/shop/login`
- `/shop/register`
- `/shop/forgot-password`
- `/shop/reset-password`
- `/shop/order-success/:id`

### Admin
- `/admin`
- `/admin/products`
- `/admin/orders`
- `/admin/coupons`
- `/admin/reviews`
- `/admin/shipping`

## 12. Gestione spedizione

### Stato attuale
La spedizione non è più hardcoded solo nel frontend.

Adesso esiste una gestione centralizzata con:
- configurazione salvata nel backend / database
- pannello admin dedicato
- checkout sincronizzato con i valori backend

### Valori gestiti
- `shippingCents` = costo spedizione standard
- `freeShippingThresholdCents` = soglia spedizione gratuita

### Logica corretta
La spedizione gratuita viene calcolata sul **totale finale dopo gli sconti**, non sul subtotale pieno.

Ordine corretto del calcolo:
1. subtotale prodotti
2. sconti globali / coupon / quantità / P.IVA / primo ordine
3. totale scontato
4. verifica soglia spedizione gratuita
5. aggiunta eventuale costo spedizione

### Backend admin shipping
- GET impostazioni: `GET /api/shipping/admin`
- UPDATE impostazioni: `PATCH /api/shipping/admin`

### Frontend admin shipping
- sezione admin dedicata: `/admin/shipping`
- i valori vengono mostrati in euro e salvati in centesimi

### Checkout
Il checkout usa i dati del `quote` backend:
- `subtotalCents`
- `discountCents`
- `shippingCents`
- `freeShippingThresholdCents`
- `totalCents`

Quindi:
- il totale mostrato è coerente con il backend
- il messaggio “Ti mancano X per la spedizione gratuita” usa la soglia reale salvata nel backend

## 13. Variabili ambiente da controllare

### Frontend
- `VITE_API_URL`
- `VITE_SITE_URL`

### Backend
- `MONGO_URI`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLIENT_ORIGIN`
- `PUBLIC_SITE_URL`
- `FRONTEND_URL`
- eventuali chiavi provider email:
  - `MAIL_TRANSPORT`
  - `MAIL_FROM`
  - `MAIL_FROM_NAME`
  - `MAIL_REPLY_TO`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `RESEND_API_KEY`

## 14. Regole importanti
- Non modificare i DNS live da Aruba
- Non rimuovere il TXT di verifica Search Console da Cloudflare
- Prima di modificare DNS, controllare sempre i nameserver live
- Registrar e DNS non sono la stessa cosa:
  - Aruba = dominio acquistato
  - Cloudflare = DNS live
- Le impostazioni spedizione vanno cambiate dal pannello admin o dal backend, non hardcodate nel frontend

## 15. Comandi utili

### Controllare nameserver live
```bash
dig +short NS qbeautyshop.it
```

### Controllare TXT live
```bash
dig +short TXT qbeautyshop.it
```

### Controllare record A live
```bash
dig +short A qbeautyshop.it
```

### Controllare CNAME www
```bash
dig +short CNAME www.qbeautyshop.it
```

## 16. Flussi operativi

### Deploy frontend
1. modifica frontend
2. commit + push
3. Vercel deploya
4. controllare build e sito

### Deploy backend
1. modifica backend
2. commit + push
3. Render deploya
4. controllare log e API

### DNS
1. controllare nameserver live
2. aprire Cloudflare
3. modificare record
4. verificare con `dig`

### Problemi pagamento
1. controllare Render log backend
2. controllare Stripe
3. controllare webhook
4. controllare ordine su database

### Modifica spedizione
1. aprire `/admin/shipping`
2. aggiornare costo spedizione e soglia gratuita
3. salvare
4. testare carrello / checkout
5. verificare che il totale sia corretto con e senza sconti

## 17. Stato attuale

### Già fatto
- dominio acquistato
- Search Console verificata
- DNS live su Cloudflare
- SEO base migliorata
- 404 migliorata
- rotte vecchie inutili rimosse
- distinzione chiara tra homepage vetrina e shop
- checkout allineato al calcolo backend
- gestione admin delle spese di spedizione
- messaggi registrazione email già usata tradotti in italiano
- migliorata coerenza stock / quantità tra shop, carrello e checkout

### Da fare
- collegare definitivamente il dominio al sito live
- verificare `robots.txt`
- verificare `sitemap.xml`
- inviare sitemap in Search Console quando il dominio sarà live
- configurare analytics se necessario
- passaggio definitivo Stripe da test a live quando pronto

## 18. Checklist pre go-live
- dominio collegato al frontend live
- backend produzione online
- env frontend corrette
- env backend corrette
- SSL attivo
- homepage ok
- shop ok
- dettaglio prodotto ok
- login/register ok
- checkout ok
- Stripe ok
- email ok
- admin ok
- admin shipping ok
- robots.txt ok
- sitemap.xml ok
- test spedizione con:
  - ordine sotto soglia
  - ordine sopra soglia
  - ordine con sconto
  - ordine con coupon

## 19. Riassunto veloce
- Dominio acquistato = Aruba
- DNS live = Cloudflare
- Frontend live = Vercel
- Backend live = Render
- Database = MongoDB
- Pagamenti = Stripe
- SEO = Search Console
- Caselle mail = Aruba
- Spedizione = configurabile da admin e calcolata dal backend