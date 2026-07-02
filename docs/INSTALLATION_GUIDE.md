# Installation Guide

## Prerequisites

- Python 3.12 or newer
- Node.js 20 or newer
- npm 10 or newer

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend setup

```bash
cd frontend
npm install
copy ..\.env.example .env
npm run dev
```

## Verify

- Backend API: `http://localhost:8000`
- Frontend app: `http://localhost:5173`
- Swagger UI: `http://localhost:8000/docs`
