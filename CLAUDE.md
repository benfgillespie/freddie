# The Generic Foiling Podcast — website

Static rebuild of genericfoilingpod.com (moving off WordPress). English-language podcast
about wing, prone, downwind and kite foiling, hosted by Freddie and Liam.

## Who's working on it
Freddie is a co-host, not a developer. Explain what you're doing in plain English, show
him the result in the browser, and avoid jargon. Ben (benfgillespie) owns the GitHub repo
and the Vercel hosting.

## Running it locally
```
npm install     # first time only
npm run dev     # then open http://localhost:3000
```
`dev-server.mjs` serves `public/` with clean URLs (`/about` → `about.html`) and runs the
`api/` functions, just like Vercel does. Restart it after editing anything in `api/`;
for HTML/CSS changes a browser refresh is enough.

## Structure
- `public/*.html` — the six pages: index (home), episodes, about, shop, support, contact
- `public/style.css` — all styles
- `public/feedback.js` — "pin a comment on the page" review tool (stores data in Vercel
  Blob, so it's empty when running locally)
- `api/rss.js` — proxies the Anchor/Spotify podcast feed (episodes load from `/api/rss`)
- `api/feedback.js` — storage for the feedback tool
- `vercel.json` — serves `public/` with clean URLs; no build step. Also sends a
  `noindex` header on every page so search engines ignore this preview copy.
  **Remove that header when the site goes live on genericfoilingpod.com.**
- `public/start.html` — Freddie's guide: part 1 is getting set up, part 2 is the
  WordPress-to-Vercel migration costs (`/costs` redirects there; not in the site menus)

## Services
- Shop: Snipcart (script on every page)
- Support Us: Buy Me a Coffee — https://www.buymeacoffee.com/gfpodcast
- Podcast email: thegenericfoilingpod@gmail.com
- Socials: Instagram, YouTube, Facebook, Spotify

## Git workflow
- Commit small, clearly described changes as you go.
- **Pushing to `main` publishes the site.** Vercel is connected to this GitHub repo and
  deploys every push to https://generic-foiling-podcast.vercel.app within a minute or two.
  So before pushing, check the change locally (`npm run dev`) and tell Freddie what will go
  live. After pushing, tell him it'll be online shortly.
- Don't run `vercel` commands from here. Pushing is the only way to publish.
- The repo is public: never commit passwords, API keys or tokens. They go in Vercel
  environment variables (Ben sets those).
