# pittybloomofficials

    npm install
    npm run dev
    npm run build

Site: `/`   Admin dashboard: `/admin`

## Project structure

Every page lives in its own folder under `src/pages/` with its own components and starting data, so changing one page does not affect another. Things used by many pages live in `src/shared/`.

    src/
      App.jsx                 all routes
      main.jsx                providers + router
      pages/
        home/                 HomePage.jsx, components/ (Hero, BestSelling, MoreProducts, AboutUs), data.js
        magazines/            MagazinesPage.jsx, components/MagazineCard.jsx, data.js
        magazine-detail/      MagazineDetailPage.jsx, components/ (CoverViewer, SizeSelector, ...), data.js
        frame/                FramePage.jsx           (Coming Soon placeholder, /frame)
        polaroids/            PolaroidsPage.jsx       (Coming Soon placeholder, /polaroids)
        sticker/              StickerPage.jsx         (Coming Soon placeholder, /sticker)
        photo-strip/          PhotoStripPage.jsx      (Coming Soon placeholder, /photo-strip)
        cart/                 CartPage.jsx            (/cart)
        account/              AccountPage.jsx         (Google sign-in, /account)
        coming-soon/          fallback for /products/:id (products added from Admin with no page yet)
        faq/  policy/  not-found/
      shared/
        ui/                   Button, Container, SmartImage, ComingSoon
        layout/               Layout, Header, Footer, ScrollToTop, navLinks.js
        context/              CartContext, SettingsContext
        services/             contentService.js, storage.js
        config/site.js        site name, texts, social links
        hooks/  utils/
      admin/                  dashboard at /admin

### Designing a Coming Soon page for real

Open its file (for example `src/pages/frame/FramePage.jsx`) and replace the `<ComingSoon />` with the real design. Nothing else needs to change.

## Images

Put real images in `public/images/` (hero slideshow photos go in `public/images/hero/`) using the paths in each page's `data.js` and `src/shared/config/site.js`, or upload them from the admin dashboard. Missing images fall back to a placeholder.

## Book preview (PDF flipbook)

In **Admin → Magazines**, each magazine has a **Book preview (PDF)** field.

- Upload an A4 PDF. The total number of pages must be divisible by 4 (4, 8, 12, 16…). Any other page count is rejected with a message and nothing is saved.
- On the magazine page the customer first sees the first page alone (closed book). Next / Previous (or click or drag the page) turns it with a page-flip animation, two pages side by side, and the last page is shown alone as the back cover. On narrow screens it shows one page at a time.
- A magazine without a PDF (or whose pages are not available) keeps the normal cover image viewer.

How it works: `src/shared/services/pdfBook.js` reads the PDF with pdf.js and renders each page to a JPEG in the browser; `src/shared/services/bookStore.js` keeps those images in IndexedDB; `src/pages/magazine-detail/components/BookViewer.jsx` shows them with `page-flip`. Like all other content right now, the pages are stored in the browser that uploaded them, so a backend is needed before visitors on other devices can see them (replace `bookStore.js` with upload/download calls to storage).

## Cloud setup: Google sign-in, Firestore, and Cloudflare R2

The magazine order flow uses Firebase Authentication, Cloud Firestore for submitted orders and saved drafts, and a Cloudflare Worker bound to a private R2 bucket for customer photos. R2 credentials never go in the browser. Firebase web app config is public client config; put it in `.env` only for convenience.

### 1. Firebase

1. Create a Firebase project and register a **Web app**. Enable **Authentication → Sign-in method → Google** and create the Firestore database.
2. Add your website hostname under **Authentication → Settings → Authorized domains**. `localhost` is normally already listed for development.
3. Copy `.env.example` to `.env`, then paste the Firebase Web app values into the matching `VITE_FIREBASE_*` fields. `VITE_MEDIA_API_URL` is filled after the Worker is deployed.
4. Deploy the included Firestore rules and indexes:

   ```powershell
   npx firebase-tools login
   Copy-Item .firebaserc.example .firebaserc
   # Edit .firebaserc and replace the project ID placeholder.
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
   ```

5. Customers use Google sign-in at `/account`. For the owner account, create one Email/Password user in **Authentication → Users → Add user**; the admin dashboard does not use Google sign-in. The site has no public admin sign-up. Copy the Email/Password user's UID, then in **Firestore → Data** create `admins/{uid}` with `role` (string: `admin`) and `email` (string: the owner email). Add that same email to the Worker `ADMIN_EMAILS` setting. The owner signs in with that email and password at `/admin/login`; other signed-in accounts are denied. Firestore rules do not let users create or change admin records.

### 2. Cloudflare R2 and the Worker

1. Install/deploy tools through the commands below, sign in to Cloudflare, and create the private bucket:

   ```powershell
   npx wrangler login
   npx wrangler r2 bucket create pittybloom-order-media
   ```

2. Edit `workers/order-media/wrangler.toml`: set `FIREBASE_PROJECT_ID`, set `APP_ORIGIN` to your exact site origin(s) separated by commas (for example `http://localhost:5173,https://shop.example.com`), and put the admin Google email(s) in `ADMIN_EMAILS`. Keep the bucket name in sync with the bucket you created.
3. Start the Worker locally with `npm run media:dev` (local R2 emulator), or deploy it with `npm run media:deploy`. Wrangler's R2 binding is the credential: **do not create or paste an R2 access key into `.env` or frontend code**.
4. Copy the Worker URL (local development is `http://localhost:8787`) into `.env` as `VITE_MEDIA_API_URL`. Restart Vite after changing `.env`. For production, use the deployed Worker URL, set the production site origin in `APP_ORIGIN`, then rebuild and deploy the website.

After `npm run build`, deploy the existing Firebase Hosting site with `npx firebase-tools deploy --only hosting --project YOUR_FIREBASE_PROJECT_ID`.

### 3. What is connected

- Google sign-in is required for magazine ordering and for cart checkout when Firebase is configured. The `/admin` routes use Email/Password sign-in and require a Firestore `admins/{uid}` record.
- Saved drafts are private to their signed-in customer; admins see drafts in a separate section. Submitted orders are shared with admins, while customers can only read their own.
- Customer photo uploads are stored as private R2 objects. The Worker verifies Firebase ID tokens, limits uploads to image files up to 20 MB, and only serves an image to its owner or a configured admin.
- Existing browser-only submitted orders are imported into Firestore the first time an admin opens the order list on that browser. Legacy drafts on a browser are claimed by the first account that signs in there.
- Site content edited in Admin is stored as individual Firestore documents; the first admin visit imports this browser's old local content. Flipbook page images and ordinary product cart contents still use browser storage. Existing local flipbook images are not automatically uploaded to R2.

See the official [Firebase web setup](https://firebase.google.com/docs/web/setup), [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore rules](https://firebase.google.com/docs/firestore/security/get-started), and [Cloudflare R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) docs when creating the projects.
