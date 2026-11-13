# Giatinh Web (Next.js)

Frontend for M.VOSS Studio. Talks to the Express API in `/backend`.

## Setup

```bash
cd web
cp .env.example .env.local
npm install
```

Ensure the API is running (`cd backend && npm run dev`) on port 4000.

Backend `.env` must include:

```env
CLIENT_ORIGIN=http://localhost:3000
```

## Run

```bash
npm run dev
```

Open http://localhost:3000

- `/` — public home (hero + feed from API)
- `/post/[slug]` — post detail
- `/admin` — studio admin (login with `ADMIN_PASSWORD`, default `voss2026`)

## Stack

- Next.js App Router
- Tailwind CSS v4
- GSAP (hero transitions)
- Express + MongoDB API (`NEXT_PUBLIC_API_URL`)
