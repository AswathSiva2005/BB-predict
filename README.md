# XAI-Stock

XAI-Stock is an explainable stock market trend prediction platform built with FastAPI and React.

## What is included

- JWT login and registration
- Protected React routes
- Remember-me authentication storage
- Prediction history, filtering, and CSV export
- Profile editing, password changes, and account deletion
- SHAP and LIME explainability views
- Tailwind CSS and Framer Motion UI

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Recharts, Framer Motion
- Backend: FastAPI, PyMongo, MongoDB Atlas, JWT authentication
- ML and explainability: pandas, NumPy, scikit-learn, TensorFlow/Keras, SHAP, LIME, TA, joblib, yfinance

## Documentation

- [Installation guide](docs/INSTALLATION_GUIDE.md)
- [Deployment guide](docs/DEPLOYMENT_GUIDE.md)
- [API documentation](docs/API_DOCUMENTATION.md)
- [System design documentation](docs/SYSTEM_DESIGN.md)
- [Machine-learning validity audit](docs/ML_AUDIT.md)
- [Base-paper methodology](docs/BASE_PAPER_METHODOLOGY.md)
- [Project screenshots](docs/SCREENSHOTS.md)

## Local development

### Backend

```bash
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\activate
pip install -r backend\requirements.txt
copy .env.example .env
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy ..\.env.example .env
npm run dev
```

## Docker

```bash
docker compose up --build
```

The frontend is served on port `5173` and the backend on port `8000`.

## Check the best model in a terminal

After training, run this command from the project root:

```powershell
python backend\ml\check_best_model.py
```

To open the result in a separate PowerShell window:

```powershell
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$PWD'; python backend\ml\check_best_model.py"
```

The command reads `backend/trained_models/model_comparison.csv`, ranks all
algorithms by weighted F1, and prints the best-performing algorithm.

## Automated checks

```powershell
backend\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
cd frontend
npm test
npm run build
```

The live Atlas smoke workflow creates an isolated test account, exercises the
protected API, and deletes the account afterward:

```powershell
backend\.venv\Scripts\python.exe -m backend.scripts.e2e_smoke --include-explanations
```

## Environment variables

Copy `.env.example` to `.env` and adjust values for your environment.

## Notes

- MongoDB Atlas is the application database and can be inspected with MongoDB Compass.
- The backend creates the required collection indexes on startup.
- The frontend points to the backend through `VITE_API_BASE_URL`.
