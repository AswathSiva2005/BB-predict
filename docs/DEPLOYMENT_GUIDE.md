# Deployment Guide

## Docker deployment

1. Create a `.env` file from `.env.example`.
2. Set a production `SECRET_KEY` and update `VITE_API_BASE_URL` if needed.
3. Build and start the services.

```bash
docker compose up --build -d
```

### Services

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Production notes

- Set `FRONTEND_ORIGINS` to the deployed frontend URL.
- Use a persistent database path or external database by changing `DATABASE_URL`.
- Store the backend secret outside version control.
- Mount or back up the SQLite database if you keep the default storage engine.

## Manual deployment

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

Serve the `dist` folder with a static web server such as Nginx.

## Release checklist

- Environment variables configured
- Database reachable
- JWT secret rotated
- Frontend base URL set
- Smoke test login, prediction, history, and profile flows
