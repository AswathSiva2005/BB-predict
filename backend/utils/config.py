import os
from pathlib import Path

from dotenv import load_dotenv

# Support the documented local `.env` setup when uvicorn is run directly.
load_dotenv(Path(__file__).resolve().parents[2] / '.env')
load_dotenv(Path(__file__).resolve().parents[1] / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent
MONGODB_URL = os.getenv('MONGODB_URL', '').strip()
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'BB-predict')
SECRET_KEY = os.getenv('SECRET_KEY', '').strip()
ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
FRONTEND_ORIGINS = [
	origin.strip()
	for origin in os.getenv('FRONTEND_ORIGINS', 'http://localhost:5173').split(',')
	if origin.strip()
]


def validate_environment() -> None:
    errors: list[str] = []
    if not MONGODB_URL:
        errors.append('MONGODB_URL is required')
    if len(SECRET_KEY) < 32 or SECRET_KEY in {
        'change-this-in-production',
        'replace-with-a-long-random-secret',
        'generate-a-random-secret-with-at-least-32-characters',
    }:
        errors.append('SECRET_KEY must be a unique random value with at least 32 characters')
    if not FRONTEND_ORIGINS:
        errors.append('FRONTEND_ORIGINS must contain at least one origin')
    if errors:
        raise RuntimeError('Invalid environment configuration: ' + '; '.join(errors))
