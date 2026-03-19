# GATE Prep Platform v2

A complete GATE exam preparation platform.

## Features
- Email OTP authentication (signup + login)
- Single active session per user
- Admin panel (users, tests, series, checklist)
- GATE-style test interface (fullscreen, tab detection, scientific calculator)
- MCQ, MSQ, NAT question types
- PDF auto-extraction
- Question images via Cloudinary
- Timed tests with auto-submit
- Leaderboard (first attempt only)
- Result comparison with topper + average score
- Test series / batches
- Syllabus checklist
- Bookmarks with notes
- Dark / Light mode

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
cp .env.example .env         # Edit with your values
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
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
SECRET_KEY=your-32-char-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=uploads

# Cloudinary (cloudinary.com - free 25GB)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gmail OTP (myaccount.google.com -> App Passwords)
SMTP_EMAIL=yourgmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
OTP_EXPIRE_MINUTES=10
```

**Note:** If SMTP not configured, OTP prints to backend terminal (for dev).

---

## Deployment

### Database: Neon.tech (free)
1. neon.tech → Create project → Copy connection string

### Backend: Render.com (free)
1. Connect GitHub repo
2. Root dir: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars from .env

### Frontend: Vercel (free)
1. Connect GitHub repo
2. Root dir: `frontend`
3. Add env: `VITE_API_URL=https://your-backend.onrender.com`

### Keep Render awake: cron-job.org
- URL: `https://your-backend.onrender.com/health`
- Every 10 minutes

---

## First Login
Register at /register — first user is auto admin.
Admin approves other users as aspirants from Users page.

## Sample Questions
Use sample_questions.json via Admin → Test → Add Questions (JSON).
