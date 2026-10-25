# VdigitalEra website

A mobile-friendly agency website focused on website design and care, Google Ads, Meta Ads, and social media handling. Includes six two-page business website concepts, a creative demo lab for ads/posts/Reels, and an enquiry form backed by SQLite.

## Run locally

Requires Node.js 22.13 or later (the built-in `node:sqlite` module is used; no package installation is needed).

1. Open a terminal in this folder.
2. Run `node server.mjs`.
3. Visit [http://localhost:4173](http://localhost:4173).
4. Enquiries submitted through the contact page are stored in `data/leads.sqlite`.
5. Stop the server with Ctrl+C.

Opening an HTML file directly will show the page, but the enquiry form needs the server running. The server binds to localhost for preview; the site is not hosted online by this package.

## Site pages

- `index.html` — VdigitalEra home, services overview, and six demo businesses.
- `services.html` — itemised starting prices and package scope.
- `contact.html` — enquiry form with service options and WhatsApp contact.
- `dashboard.html` — private owner dashboard for page-view totals, CTA clicks, and enquiries. Requires the Vercel `DASHBOARD_PASSWORD` environment variable (20+ characters); never commit that password.
- `demos/index.html?site=real-estate` — demo home pages. Use the dropdown to choose any concept; the navigation links to each demo's second page.
- Add `&page=services` to a demo URL for its details/listings/menu/classes/trips page.
- `campaign-demos.html` — choose any of the six business concepts to preview a Google Search ad, Meta feed ad, three social posts, and a 15-second Reel storyboard.

The six demo concepts are Haven & Field Realty, Kindred Care Clinic, Olive & Ember Kitchen, Forma Living Co., Form House Studio, and Elsewhere Journeys. Demo brand claims and content are illustrative; replace them with verified client information in commissioned work.

## Current package scope

Website and website care are listed first, followed by Google/Meta Ads, then social media. Social Starter uses a 12-piece monthly scope across Instagram and Facebook (8 static/carousel designs plus 4 Reels edited from supplied footage), story frames, scheduling, and reporting. The published [iBACT Digital India rate card](https://ibact.digital/social-media-marketing/) uses a similar ₹9,999 entry point and 12-post/4-Reel monthly scope. VdigitalEra's Growth plan uses a larger 20-piece/8-Reel scope; detailed boundaries and exclusions are shown on the pricing page.

Launch display prices: website build ₹2,999 once (standard ₹19,999); website care ₹1,999 for month one (then ₹2,999/month); Google Ads and Meta Ads management ₹2,999 each for month one (then ₹5,999/month); Social Starter ₹2,999 for month one (then ₹9,999/month); Social Growth ₹5,999 for month one (then ₹17,999/month). These use the prior site prices as the crossed-out standard rates. Ad spend remains separate.

## WhatsApp

The floating WhatsApp buttons open a chat with `+91 94578 86467` and include a short prefilled message. Update the link in `app.js`, `demos/demo.js`, and the relevant footer/contact links if the number changes.

## Enquiry data and going live

Local preview submissions are saved in SQLite at `data/leads.sqlite`. On Vercel, `api/leads.js` stores submissions in Postgres using the `DATABASE_URL` environment variable. Connect a Postgres Marketplace database to the Vercel project before accepting public enquiries; without it, the API returns a clear temporary-unavailable response. The function creates the `enquiries` table on its first valid submission. The Vercel deployment does not use SQLite.

For the owner dashboard, add `DASHBOARD_PASSWORD` in Vercel → Project Settings → Environment Variables, set it for Production, and redeploy. Use a unique password of at least 20 characters; do not put it in GitHub or public source files. Open `/dashboard.html` and sign in. Owner data is served only by the authenticated `/api/admin/overview` endpoint. `insights.js` records anonymous page views and selected CTA categories only; it does not store visitor IP addresses, identifiers, referrers, or form values. Visit totals are page views, not unique visitors. The `site_events` table is created automatically on the first recorded event.

Restrict database access and configure backups/retention with the database provider. Tell visitors that anonymous page views and selected CTA taps are counted, and explain how enquiry details are used to reply to them.

Before launch, replace the sample email, confirm all prices and deliverables against your capacity and local taxes, provide real contact/business details and a privacy notice, and confirm usage rights for the external demo images. Ad spend, applicable taxes, domain/hosting, production filming, and paid tools are additional unless a written quote says otherwise. Prices are introductory starting fees, not outcome guarantees.
