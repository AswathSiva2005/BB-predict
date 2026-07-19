# Installation Guide

## Prerequisites

- Python 3.12 or 3.13 (Python 3.14 is not yet supported by the pinned ML packages)
- Node.js 20 or newer
- npm 10 or newer
- A MongoDB Atlas cluster and a database user, with your IP allowed under Atlas Network Access

## Backend setup

```bash
cd "C:\SEM - 7\Final Year Project\BB-predict"
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\activate
pip install -r backend\requirements.txt
copy .env.example .env
# Set MONGODB_URL and MONGODB_DATABASE=BB-predict in .env
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
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

Use the same `MONGODB_URL` in MongoDB Compass to inspect the `BB-predict` database and its `users`, `prediction_history`, and `training_history` collections.
