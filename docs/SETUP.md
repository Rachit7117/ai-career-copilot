# AI Career Copilot — Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project (free tier works)
- A Groq API key (free tier: console.groq.com)

---

## 1. Supabase Setup

### Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and both API keys (anon + service_role)

### Run Migrations
In Supabase Dashboard → SQL Editor, run in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### Create Storage Buckets
In Supabase Dashboard → Storage → New Bucket:
- Name: `resumes` — Private — 10MB limit
- Name: `exports` — Private — 10MB limit

### Enable Auth Providers
In Supabase Dashboard → Authentication → Providers:
- Email: Enable (confirm email optional for dev)
- Google: Enable (requires Google OAuth credentials)

---

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values

# Generate encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Paste output as ENCRYPTION_KEY in .env

# Run development server
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

App available at: `http://localhost:3000`

---

## 4. Environment Variables Reference

### Backend (.env)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | service_role key (keep secret) |
| `SUPABASE_ANON_KEY` | anon/public key |
| `GROQ_API_KEY` | Groq API key (default AI) |
| `DEFAULT_MODEL` | LiteLLM model string |
| `ENCRYPTION_KEY` | Fernet key for API key encryption |

### Frontend (.env.local)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

---

## 5. Deployment

### Backend — Railway / Render / Fly.io

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway new
railway up
# Set env vars in Railway dashboard
```

**Render:**
- Connect GitHub repo
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend — Vercel

```bash
npm install -g vercel
vercel
# Set env vars in Vercel dashboard
```

Or connect your GitHub repo at vercel.com.

**NEXT_PUBLIC_API_URL** must point to your deployed backend URL.

---

## 6. Getting Your Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free)
3. API Keys → Create API Key
4. Set as `GROQ_API_KEY` in backend `.env`

---

## 7. Quick Start Flow

1. Open the app → Sign up
2. Go to **Resume Library** → Upload your resume (PDF/DOCX)
3. Wait for AI parsing (~10 seconds)
4. Set it as **Active**
5. Go to **New Application** → Paste job description
6. From the Application page:
   - Generate **ATS Resume** — see keyword match
   - Generate **Cover Letter**
   - Generate **Interview Kit**
   - Generate **Learning Roadmap**

---

## 8. Architecture

```
Frontend (Next.js 14 / Vercel)
    ↓ HTTPS + Supabase JWT
Backend (FastAPI / Railway)
    ↓
LiteLLM → Groq (default) / OpenAI / Claude / etc.
    ↓
Supabase PostgreSQL + Storage + Auth
```

All data is row-level secured — users can only access their own data.
