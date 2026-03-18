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
  - contatori ordini

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
- Da controllare nel backend tramite i file mailer / env
- Usate per:
  - conferma ordine
  - conferma pagamento
  - spedizione
  - bonifico

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

## 12. Variabili ambiente da controllare

### Frontend
- `VITE_API_URL`
- `VITE_SITE_URL`

### Backend
- `MONGODB_URI`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- eventuali chiavi provider email

## 13. Regole importanti
- Non modificare i DNS live da Aruba
- Non rimuovere il TXT di verifica Search Console da Cloudflare
- Prima di modificare DNS, controllare sempre i nameserver live
- Registrar e DNS non sono la stessa cosa:
  - Aruba = dominio acquistato
  - Cloudflare = DNS live

## 14. Comandi utili

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

## 15. Flussi operativi

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

## 16. Stato attuale

### Già fatto
- dominio acquistato
- Search Console verificata
- DNS live su Cloudflare
- SEO base migliorata
- 404 migliorata
- rotte vecchie inutili rimosse
- distinzione chiara tra homepage vetrina e shop

### Da fare
- collegare definitivamente il dominio al sito live
- verificare `robots.txt`
- verificare `sitemap.xml`
- inviare sitemap in Search Console quando il dominio sarà live
- configurare analytics se necessario

## 17. Checklist pre go-live
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
- robots.txt ok
- sitemap.xml ok

## 18. Riassunto veloce
- Dominio acquistato = Aruba
- DNS live = Cloudflare
- Frontend live = Vercel
- Backend live = Render
- Database = MongoDB
- Pagamenti = Stripe
- SEO = Search Console
- Caselle mail = Aruba