# Giatinh API

Express + MongoDB + Cloudinary backend for the M.VOSS studio site.

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, ADMIN_PASSWORD, Cloudinary keys
npm install
```

Requires a running MongoDB instance (`MONGODB_URI`).

Cloudinary keys are optional until you call `POST /api/upload`. Hero/posts can be seeded with Unsplash URLs without Cloudinary.

## Run

```bash
npm run seed   # create admin + default hero slides + sample post
npm run dev    # http://localhost:4000
```

Production:

```bash
npm run build
npm start
```

## Auth

Login with `ADMIN_PASSWORD` (default in `.env.example`: `voss2026`).

```bash
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"voss2026\"}"
```

JWT is returned in the JSON body (`token`) and as an httpOnly `token` cookie. Send either the cookie or `Authorization: Bearer <token>` on admin routes.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | — |
| POST | `/api/auth/login` | — |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | admin |
| GET | `/api/hero` | — |
| POST | `/api/hero` | admin |
| PUT | `/api/hero` | admin (replace/reorder list) |
| DELETE | `/api/hero/:id` | admin |
| GET | `/api/posts` | — (published only) |
| GET | `/api/posts/:slug` | — |
| GET | `/api/admin/posts` | admin |
| POST | `/api/admin/posts` | admin |
| PUT | `/api/admin/posts/:id` | admin |
| DELETE | `/api/admin/posts/:id` | admin |
| POST | `/api/upload` | admin (multipart `file`, optional `folder`, `saveToVault`) |
| GET | `/api/assets` | admin |
| DELETE | `/api/assets/:id` | admin |

### Upload example

```bash
curl -b cookies.txt -X POST http://localhost:4000/api/upload \
  -F "file=@./photo.jpg" \
  -F "folder=hero"
```

Response includes `url`, `publicId`, `resourceType`. Attach those to hero slides or post blocks.

## Env

| Variable | Description |
|----------|-------------|
| `PORT` | Default `4000` |
| `MONGODB_URI` | Mongo connection string. For Atlas `mongodb+srv://...`, **URL-encode** special chars in the password (`@` → `%40`, `+` → `%2B`, `/` → `%2F`) |
| `JWT_SECRET` | Signing secret for JWTs |
| `ADMIN_PASSWORD` | Used by `npm run seed` |
| `CLIENT_ORIGIN` | CORS origin (Vite default `http://localhost:5173`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Cloudinary key |
| `CLOUDINARY_API_SECRET` | Cloudinary secret |
