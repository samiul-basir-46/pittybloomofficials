# pittybloomofficials

    npm install
    npm run dev
    npm run build

Site: `/`   Admin dashboard: `/admin`

## Images

Put real images in `public/images/` (hero slideshow photos go in `public/images/hero/`) using the paths in `src/data/*` and `src/config/site.js`, or upload them from the admin dashboard. Missing images fall back to a placeholder.

## Backend later

All content goes through `src/services/contentService.js`, which reads and writes through `src/services/storage.js` (browser localStorage for now). Replace the four functions in `storage.js` (`get`, `set`, `clear`) with API calls and the whole site plus admin dashboard will use the backend. Add login protection around the `/admin` routes in `src/App.jsx` at the same time.
