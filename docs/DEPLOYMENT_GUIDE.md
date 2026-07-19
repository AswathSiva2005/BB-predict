# Deployment Guide

## Docker deployment

1. Create a `.env` file from `.env.example`.
2. Set `MONGODB_URL`, `MONGODB_DATABASE`, a production `SECRET_KEY`, and update `VITE_API_BASE_URL` if needed.
3. Build and start the services.

```bash
docker compose up --build -d
```

### Services

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Production notes

- Set `FRONTEND_ORIGINS` to the deployed frontend URL.
- Allow the deployment host's IP address in MongoDB Atlas Network Access.
- Store the MongoDB URI and backend secret outside version control.
- Configure MongoDB Atlas backups for production data.

## Manual deployment

### Backend

```bash
cd "C:\SEM - 7\Final Year Project\BB-predict"
backend\.venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
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
- MongoDB Atlas cluster reachable
- JWT secret rotated
- Frontend base URL set
- Smoke test login, prediction, history, and profile flows
