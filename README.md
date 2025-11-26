<div align="center">
  
  ![GitHub repo size](https://img.shields.io/github/repo-size/codewithsadee/organica)
  ![GitHub stars](https://img.shields.io/github/stars/codewithsadee/organica?style=social)
  ![GitHub forks](https://img.shields.io/github/forks/codewithsadee/organica?style=social)
[![Twitter Follow](https://img.shields.io/twitter/follow/codewithsadee_?style=social)](https://twitter.com/intent/follow?screen_name=codewithsadee_)
  [![YouTube Video Views](https://img.shields.io/youtube/views/sgCSEk1XsCo?style=social)](https://youtu.be/sgCSEk1XsCo)

  <br />
  <br />

  <h2 align="center">Organica - eCommerce website</h2>

  Organica is a fully responsive organic ecommerce website, <br />Responsive for all devices, build using HTML, CSS, and JavaScript.

  <a href="https://codewithsadee.github.io/organica/"><strong>➥ Live Demo</strong></a>

</div>

<br />

### Demo Screeshots

![Organica Desktop Demo](./readme-images/desktop.png "Desktop Demo")

### Prerequisites

Before you begin, ensure you have met the following requirements:

* [Git](https://git-scm.com/downloads "Download Git") must be installed on your operating system.

### Run Locally

To run **Organica** locally, run this command on your git bash:

Linux and macOS:

```bash
sudo git clone https://github.com/codewithsadee/organica.git
```

Windows:

```bash
git clone https://github.com/codewithsadee/organica.git
```

### Contact

If you want to contact with me you can reach me at [Twitter](https://www.twitter.com/codewithsadee).

### License

This project is **free to use** and does not contains any license.

## Backend API & MongoDB

This workspace includes a minimal Express API (`server.js`) and MongoDB data.

- Start the server: `npm run start` (serves static files and `/api/*`)
- Seed local MongoDB: `npm run seed:mongo`

### Use MongoDB Atlas

1) Set your Atlas connection string in environment:

On Windows PowerShell:

```powershell
$env:MONGO_URL = "mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<app>"
```

Or update `.env` with `MONGO_URL=...` (do not commit secrets).

2) Migrate local data to Atlas (optional):

```powershell
# Local source is mongodb://localhost:27017 by default
# Set DB name if you changed it (defaults to 'organica')
$env:MONGO_LOCAL_URL = "mongodb://localhost:27017"
npm run migrate:mongo
```

3) Run the server (now using Atlas):

```powershell
npm start
# Check health
# http://localhost:3000/api/health -> { ok: true, db: "organica", products: N, categories: M }
```

## Authentication (JWT) & Roles (Legacy)

- Endpoints:
  - `POST /api/auth/signup` → body `{ name, email, password }` → returns `{ user, accessToken, refreshToken }`
  - `POST /api/auth/login` → body `{ email, password }` → returns `{ user, accessToken, refreshToken }`
  - `POST /api/auth/refresh` → body `{ refreshToken }` → returns `{ accessToken, refreshToken }` (rotation)
  - `POST /api/auth/logout` → body `{ refreshToken }`
  - `GET /api/me` → requires `Authorization: Bearer <accessToken>`
  - `GET /api/admin/health` → requires admin role

- Roles: `user` by default. Set an admin at startup using `.env`:

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=StrongPassword123!
```

On first start with these set, an admin user is created. Remove the vars afterwards.

- Cart/Wishlist: when logged in, data is stored per user; guest users continue to use session storage. On login/signup, the guest session is merged into the user account.

## Deployment (Vercel)

This project can be deployed to Vercel with zero build step (pure static + one Node serverless function for the API).

### Minimal Setup

1. Connect the GitHub repository in Vercel.
2. Framework preset: "Other". Leave build command empty.
3. Root directory: project root (where `index.html` lives).
4. Environment Variables (add in Vercel dashboard):
  - `MONGO_URL` = your Atlas connection string
  - `MONGO_DB_NAME` (optional, defaults to `organica`)
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` for first‑run admin bootstrap (optional, remove after first deployment)
5. Redeploy.

Static files (HTML, CSS, images, JS) are served automatically. The API is exposed via a single rewrite pointing `/api/*` to `api/index.js` (see `vercel.json`).

If you ever see missing CSS/images on Vercel:
  - Ensure `vercel.json` does NOT contain a catch‑all route sending everything to `index.html`.
  - Current working file uses only a rewrite for `/api/*` so assets resolve correctly.
  - Paths in HTML should be relative: `assets/css/main.css`, not an absolute external URL.

### Clean URLs (Optional)
You can add `"cleanUrls": true` to `vercel.json` if you want `/about` instead of `/about.html`.

### Local vs Vercel Differences
- Local Express serves static + API directly.
- Vercel serves static through the CDN layer; only `/api/*` hits the serverless function.

## Quick API Usage (curl)

Below examples assume the deployment base URL is stored in `$BASE` (PowerShell):

```powershell
$BASE="https://your-vercel-domain" # adjust
```

### Signup & Login
```powershell
curl -X POST "$BASE/api/auth/signup" -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com","password":"Secret123!"}'
curl -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Secret123!"}'
```
Capture `accessToken` and `refreshToken` from responses.

### /api/me
```powershell
$token = "<ACCESS_TOKEN>"
curl -H "Authorization: Bearer $token" "$BASE/api/me"
```

### Refresh Token
```powershell
curl -X POST "$BASE/api/auth/refresh" -H "Content-Type: application/json" -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

### Admin Health (requires admin accessToken)
```powershell
curl -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" "$BASE/api/admin/health"
```

### Products (Public list)
```powershell
curl "$BASE/api/products"
```

### Create Product (Admin)
```powershell
curl -X POST "$BASE/api/admin/products" -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"name":"Sample","slug":"sample","price":9.99,"categorySlug":"fresh-vegetables","image":"top-product-1.png"}'
```

### Update Product (Admin)
```powershell
curl -X PUT "$BASE/api/admin/products/<PRODUCT_ID>" -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"price":10.49}'
```

### Delete Product (Admin)
```powershell
curl -X DELETE "$BASE/api/admin/products/<PRODUCT_ID>" -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Logout
```powershell
curl -X POST "$BASE/api/auth/logout" -H "Content-Type: application/json" -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

### Health Check
```powershell
curl "$BASE/api/health"
```

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Unstyled page on Vercel | Catch‑all route sending assets to `index.html` | Use only rewrite for `/api/*` |
| 404 for images | Wrong path or file name | Verify `assets/images/<file>` exists & case matches |
| API 500 on first deploy | Missing `MONGO_URL` | Add env var & redeploy |
| Admin endpoints unauthorized | Not admin token | Ensure admin user created with env vars on first run |


