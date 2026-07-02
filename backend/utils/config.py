import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / 'xai_stock.db'
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DATABASE_PATH}')
SECRET_KEY = os.getenv('SECRET_KEY', 'change-this-in-production')
ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
FRONTEND_ORIGINS = [
	origin.strip()
	for origin in os.getenv('FRONTEND_ORIGINS', 'http://localhost:5173').split(',')
	if origin.strip()
]
