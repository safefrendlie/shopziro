# Shopziro — Your Business. Your World.

A digital commerce platform where anyone can create, customize, showcase and grow their own online store.

React + Vite front end, Supabase (database, login, image storage, realtime), installable PWA, optional 3D shop (Three.js).

---

## GO LIVE IN 7 STEPS (free)

### 1. Create the database (Supabase, free)
1. Sign up at https://supabase.com and click **New project** (pick a region near your customers).
2. Open **SQL Editor → New query**, paste the **entire** file `supabase/schema.sql`, press **Run**.
   It creates all tables, security rules, notification triggers, the image bucket and realtime. It is safe to run again.
3. Open **Authentication → Providers → Email**.
   - For quick testing, turn **Confirm email OFF** (users can log in immediately).
   - For real launch, keep it ON and set up SMTP (Authentication → SMTP) so confirmation mails are reliable.
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.

### 2. Run it on your computer (optional but recommended)
```bash
npm install
cp .env.example .env      # then paste the two Supabase values into .env
npm run dev               # http://localhost:5173
npm run build             # must finish with no errors before you deploy
```

### 3. Put the code on GitHub
Create an empty repository, then:
```bash
git init && git add . && git commit -m "Shopziro" && git branch -M main
git remote add origin https://github.com/YOUR-NAME/shopziro.git && git push -u origin main
```
(`.env` is git-ignored on purpose. Never commit keys you did not mean to share. The anon key is public by design; security comes from the database rules.)

### 4. Deploy (Vercel, free)
1. https://vercel.com → **Add New → Project** → import your GitHub repo (Framework: **Vite**, auto-detected).
2. Add **Environment Variables**:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key |
   | `VITE_SITE_URL` | your final address, e.g. `https://shopziro.com` (used in share links and QR codes) |
   | `VITE_DEFAULT_CURRENCY` | optional, e.g. `INR` |
3. **Deploy**. `vercel.json` already makes shop links like `/shop/cake-house` work on refresh.
   (Netlify also works: `public/_redirects` is included. Build command `npm run build`, publish folder `dist`.)

### 4b. IMPORTANT: make links, QR codes and "Install app" work for everyone
If a shared link or QR code asks people to log in to **Vercel**, or the app will not install, Vercel's *Deployment Protection* is switched on. Fix it once:
1. Vercel → your project → **Settings → Deployment Protection**.
2. Turn **Vercel Authentication** to **Disabled** (for Production at least) and save.
3. Always share the **Production** address (Settings → Domains), never a long preview address that contains your account name.
4. Set `VITE_SITE_URL` to that production address and redeploy. The **Share and QR** page warns you if a link looks unsafe.
5. Open `https://YOUR-ADDRESS/manifest.webmanifest` in a private window. You should see JSON, not a login page. After that, **Install app** works on Android/desktop Chrome, and on iPhone use Share → Add to Home Screen.

### 5. Tell Supabase your live address
**Authentication → URL Configuration**
- **Site URL**: your live address (e.g. `https://shopziro.vercel.app`)
- **Redirect URLs**: add `https://YOUR-ADDRESS/**` and `http://localhost:5173/**`

Without this, password-reset and email-confirmation links will not return to your site.

### 6. Your own domain (optional, about ₹800–1000/year)
Buy a domain, add it in Vercel → **Settings → Domains**, follow the DNS steps, then update `VITE_SITE_URL` and the Supabase Site URL, and redeploy.

### 7. Test like a real customer (10 minutes)
1. Register a **Seller** → create shop → upload a logo (try an iPhone HEIC photo) → add a product, a custom-order product and a quote service.
2. **Customise** → pick a theme → **Publish shop**.
3. In a private window: register a **Buyer** → open the shop link → add to cart → checkout. The seller hears a soft chime and sees the order.
4. Seller accepts and completes the order → buyer reviews → seller replies.
5. On a phone (Chrome or Safari) open the site → **Install app**.
6. Seller → **Share & QR**: copy a link, scan the QR code with another phone, and confirm it opens the shop with no login.

---

## What is inside

| Area | What it does |
|---|---|
| Accounts | Separate **Seller** and **Buyer** roles, enforced by the database (a buyer cannot open seller pages or change role) |
| Shop builder | 6 themes, custom colours/font/roundness, banner, announcement bar, live phone/desktop preview. Changes stay in a **draft** until **Publish** |
| Products & services | Fixed price, custom order (your own questions: size, flavour, date, reference photo), request a quote. Variations, stock status, up to 6 photos, hide/show, plan limits |
| Uploads | JPG, PNG, WEBP and **HEIC** (converted in the browser), preview, replace, delete, size/format checks, auto-resize for speed |
| Marketplace | Search shops and products; filters for category, city, rating, price; trending, new, top rated, featured |
| Orders | Cart, checkout (cash on delivery / pay seller directly / WhatsApp), accept, decline, in progress, completed, cancel, mark paid. Totals are calculated **on the server** |
| Enquiries | Custom orders and quote requests, seller sends a quotation, buyer accepts or declines |
| Reviews | Only buyers with a **completed order** can review (verified). Seller can reply |
| Analytics | Real visits, sources (instagram, whatsapp, qr…), orders, sales, top products. No sample numbers |
| Connect (optional) | WhatsApp, Instagram, Facebook, TikTok, YouTube, X, Website. Each is an optional **Connect** button; the storefront then shows Follow/Chat buttons |
| Sharing | Copy link, WhatsApp/Facebook/X share, per-platform tracking links, downloadable QR code |
| 3D shop | Optional. Building with signboard, tap the door, walk in, tap a picture to open the product. Hidden if the device has no WebGL; the normal store is always there |
| PWA | Manifest, icons, service worker, **Install app** button, offline shell, unread badge on the app icon |
| Notifications | See below |
| Design | Dark 2026 look: bento cards, glass bars, lime/violet accents. Separate layouts: phone (bottom navigation), tablet (icon rail), desktop (full sidebar) |

### Notifications and sound
- When an order, quote request, review, reply or status change happens, the database writes a notification and the app receives it **instantly** (Supabase Realtime).
- It plays a **soft two-note chime** (generated in the browser, no annoying ringtone), shows a toast, vibrates lightly on phones, and updates the bell and the app-icon badge.
- Users can turn the sound off and enable **browser alerts** in *Account → Notifications and sound*. Alerts also appear when the tab is in the background or the installed app is minimised.
- Browsers only allow sound after the first tap on the page. This is a browser rule, so the first chime after opening the app may be silent.
- **Alerts while the app is completely closed** need server-sent Web Push (VAPID keys plus a Supabase Edge Function). The service worker already has the `push` handler; the server part is not included. Until then, open notifications appear the next time the app is opened.

### Make a shop "Featured" or upgrade a plan (you are the platform owner)
Sellers cannot do this themselves. In Supabase **SQL Editor**:
```sql
update public.shops set featured = true where slug = 'shop-slug';
update public.shops set plan = 'pro' where slug = 'shop-slug';   -- free: 50 items, pro: 1000, business: unlimited
```

## Project layout
```
supabase/schema.sql     database, security rules, triggers, storage (run once)
src/lib                 helpers, image pipeline (HEIC), sounds, Supabase client
src/state               login, cart, toasts, live notifications, PWA install
src/components          logo, icons, shop view, 3D shop, uploader, cards
src/pages               public pages, seller/ dashboard, buyer/ dashboard
public                  manifest, service worker, icons (generated from the logo)
```

## Honest limits
- **No online card/UPI gateway yet.** Payment is cash on delivery, pay-seller-directly (seller's UPI/bank note shown at checkout), or WhatsApp. Gateways (Razorpay, Stripe, JazzCash…) need a business account and a server function.
- "Connect" saves public handles/links. It does not use social-media login, post for you, or grow followers.
- Free Supabase plan: 500 MB database, 1 GB image storage, 50k monthly users. Enough for hundreds of shops. Projects with no activity for 7 days are paused on the free plan.
- Quote and custom requests do not reserve stock. Only fixed-price items are ordered through the cart.
