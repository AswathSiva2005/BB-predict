from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.api.routes import router
from backend.database.session import init_db
from backend.utils.config import FRONTEND_ORIGINS

app = FastAPI(
    title='XAI-Stock API',
    description='Backend for an explainable stock trend prediction research project.',
    version='0.1.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router)
app.mount('/artifacts', StaticFiles(directory=str(Path(__file__).resolve().parent / 'trained_models')), name='artifacts')


@app.on_event('startup')
def on_startup() -> None:
    init_db()


@app.get('/')
def root() -> dict[str, str]:
    return {'message': 'XAI-Stock API is running'}
