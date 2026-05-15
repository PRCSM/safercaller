# SAFERCALLER Admin Panel

Desktop-only React admin for the SAFERCALLER mobile app. Connects to the same
Firestore as the mobile client.

## Why Vite, not Create React App

CRA was deprecated by the React team in 2023 and removed from the official
getting-started docs. Vite is the current standard — faster dev server,
smaller config surface, identical npm-script UX (`npm run dev`). If you have
a specific CRA dependency, swap the dev tooling — every component file is
framework-agnostic React.

## Stack

- Vite + React 18 + TypeScript
- React Router v6 (path-based routes, no data loaders)
- @tanstack/react-query v5 (server state)
- recharts (analytics charts)
- framer-motion (transitions, drawer, table-row stagger)
- firebase web SDK v12 (Firestore + Storage + Auth)
- sonner (toast notifications)

## Run

```bash
cd safercaller-admin
npm install
npm run dev
# → http://localhost:5173
```

By default `VITE_USE_MOCK=true` in `.env.example`. Mock data lives in
`src/lib/mockData.ts`. Flip to false and provide real `VITE_FIREBASE_*`
credentials to hit the live Firestore.

## Pages

- `/dashboard` — built. Stat cards, recent scam reports, high-risk users.
- `/users`, `/scam-complaints`, `/listings`, `/chat`, `/notifications`,
  `/terms`, `/analytics` — routed placeholders. One per future turn.

## Animation accessibility

Every animation route checks `prefers-reduced-motion` via `useReducedMotion`
and skips to the end state. Toasts, drawer, count-ups, row stagger all
respect this.