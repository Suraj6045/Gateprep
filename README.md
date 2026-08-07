---
title: Gateprep
sdk: docker
app_port: 7860
---

# GATE Prep Platform v2

A complete GATE exam preparation platform.

## Features
- Admin panel (users, tests, series, checklist)
- GATE-style test interface (fullscreen, tab detection, scientific calculator)
- Timed tests with auto-submit
- Leaderboard (first attempt only)
- Test series
- Bookmarks with notes
---

## Quick Start (Docker)

```bash
docker compose up --build
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```
---

## Manual Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
# Create .env and edit with your values
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
# Create .env file:
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

---

## Environment Variables (backend/.env)

```
DATABASE_URL=postgresql+psycopg2://postgres.<project-ref>:<URL_ENCODED_PASSWORD>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
SECRET_KEY=your-32-char-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=
PASSWORD_RESET_EXPIRE_MINUTES=30
UPLOAD_DIR=uploads
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

For Supabase passwords, URL-encode special characters before adding them to
`DATABASE_URL`:

```
@ -> %40
# -> %23
/ -> %2F
: -> %3A
& -> %26
+ -> %2B
% -> %25
```

The backend reads `DATABASE_URL` from the environment, normalizes
`postgresql://` URLs to `postgresql+psycopg2://`, and adds `sslmode=require`
for remote Postgres hosts.

---

## Deployment

### Database: Supabase
1. Create a Supabase project.
2. Open Project Settings -> Database -> Connection string.
3. Use the pooler URL on port `6543`.
4. URL-encode the database password before adding it to `DATABASE_URL`.


### Backend: Hugging Face Spaces
Create a Docker Space using the repository root. The root `Dockerfile` runs the
FastAPI backend with:

```
uvicorn app.main:app --host 0.0.0.0 --port 7860
```

Set these Hugging Face Space secrets or variables:

```
DATABASE_URL=postgresql+psycopg2://postgres.<project-ref>:<URL_ENCODED_PASSWORD>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
SECRET_KEY=your-32-char-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=/data/uploads
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_EXPIRE_MINUTES=30
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

`UPLOAD_DIR=/data/uploads` is supported by the Docker image. The image creates
`/data/uploads` and gives the Hugging Face user ownership before the app starts.

### Frontend: Vercel
1. Connect GitHub repo
2. Root dir: `frontend`
3. Add env:

```
VITE_API_URL=https://hfusername-gateprep.hf.space
```

For production CORS, set this in the Hugging Face backend environment:

```
CORS_ORIGINS=http://localhost:5173
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
```

Use `AUTH_COOKIE_SAMESITE=strict` only when the frontend and backend are served
from the same site, such as behind one HTTPS reverse proxy. Cross-site frontend
and API deployments need `SameSite=None; Secure` or the browser will log in
successfully but omit the cookie on the next API request.

Render wake-up cron instructions are obsolete for the Hugging Face Spaces
backend.

---

## First Login
Register at /register — first user is auto admin.
Admin approves other users as aspirants from Users page.
