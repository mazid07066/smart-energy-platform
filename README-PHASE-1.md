# Smart Energy Platform — Phase 1

This package contains:

- `webapp`: Next.js 16 / React 19 dashboard
- `firebase`: initial Realtime Database JSON and development rules

## Install

```powershell
cd D:\smart-energy-platform\webapp
Copy-Item .env.local.example .env.local
notepad .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build verification

```powershell
npm run lint
npm run build
```
