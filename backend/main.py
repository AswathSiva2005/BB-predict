import logging
import os

# SHAP/LIME plots are generated inside FastAPI worker threads. Force a
# headless backend before importing routes (and therefore matplotlib) so
# Tkinter GUI objects are never created on the server.
os.environ.setdefault('MPLBACKEND', 'Agg')

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pymongo.errors import PyMongoError

from backend.api.routes import router
from backend.database.session import init_db
from backend.utils.config import FRONTEND_ORIGINS, validate_environment

logger = logging.getLogger(__name__)

app = FastAPI(
    title='XAI-Stock API',
    description='Backend for an explainable stock trend prediction research project.',
    version='0.1.0',
)

app.include_router(router)
app.mount('/artifacts', StaticFiles(directory=str(Path(__file__).resolve().parent / 'trained_models')), name='artifacts')


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
    """Expose invalid request values as useful client errors rather than 500s."""
    return JSONResponse(status_code=400, content={'detail': str(exc)})


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """Return a CORS-compatible JSON response while retaining the traceback in logs."""
    logger.exception('Unhandled API error', exc_info=exc)
    return JSONResponse(status_code=500, content={'detail': 'The server could not complete this request.'})


@app.on_event('startup')
def on_startup() -> None:
    validate_environment()
    try:
        init_db()
    except PyMongoError:
        # Atlas DNS/primary elections can be temporarily unavailable. Do not
        # terminate the whole API: PyMongo keeps monitoring the topology and
        # subsequent requests can recover without restarting Uvicorn.
        logger.exception('MongoDB initialization deferred; Atlas is temporarily unavailable')


@app.get('/')
def root() -> dict[str, str]:
    return {'message': 'XAI-Stock API is running'}


# Keep CORS outside FastAPI's error middleware so headers are present even when
# an unexpected exception occurs before a normal route response is produced.
app = CORSMiddleware(
    app=app,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
