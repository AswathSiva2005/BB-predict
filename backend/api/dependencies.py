from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pymongo.database import Database

from backend.auth.jwt import decode_access_token
from backend.database.session import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/auth/login')


def get_db() -> Database:
    return get_database()


def get_current_user(token: str = Depends(oauth2_scheme), db: Database = Depends(get_db)) -> dict:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Could not validate credentials', headers={'WWW-Authenticate': 'Bearer'})
    try:
        email = decode_access_token(token).get('sub')
        if not email:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc
    user = db.users.find_one({'email': str(email).lower()}, {'hashed_password': 0})
    if not user:
        raise credentials_exception
    user['id'] = str(user.pop('_id'))
    return user
