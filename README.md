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
        cart/                 CartPage.jsx            (Coming Soon placeholder, /cart)
        account/              AccountPage.jsx         (Coming Soon placeholder, /account)
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

## Backend later

All content goes through `src/shared/services/contentService.js`, which reads and writes through `src/shared/services/storage.js` (browser localStorage for now). Replace the functions in `storage.js` (`get`, `set`, `clear`) with API calls and the whole site plus admin dashboard will use the backend. Add login protection around the `/admin` routes in `src/App.jsx` at the same time.
