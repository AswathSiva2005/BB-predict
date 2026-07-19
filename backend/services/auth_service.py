from datetime import datetime, timezone

from pymongo.database import Database

from backend.auth.jwt import create_access_token
from backend.auth.schemas import PasswordChange, TokenResponse, UserCreate, UserUpdate
from backend.utils.security import hash_password, verify_password


def _public_user(user: dict) -> dict:
    return {'id': str(user['_id']), 'full_name': user['full_name'], 'email': user['email'], 'is_active': user.get('is_active', True)}


def create_user(db: Database, payload: UserCreate) -> dict:
    document = {'full_name': payload.full_name, 'email': payload.email.lower(), 'hashed_password': hash_password(payload.password), 'is_active': True, 'created_at': datetime.now(timezone.utc)}
    result = db.users.insert_one(document)
    document['_id'] = result.inserted_id
    return _public_user(document)


def authenticate_user(db: Database, email: str, password: str) -> dict | None:
    user = db.users.find_one({'email': email.lower()})
    return _public_user(user) if user and verify_password(password, user['hashed_password']) else None


def build_token_response(user: dict) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(subject=user['email']))


def update_user_profile(db: Database, user: dict, payload: UserUpdate) -> dict:
    updates = {}
    if payload.email and payload.email.lower() != user['email']:
        if db.users.find_one({'email': payload.email.lower(), '_id': {'$ne': __import__('bson').ObjectId(user['id'])}}):
            raise ValueError('Email already registered')
        updates['email'] = payload.email.lower()
    if payload.full_name:
        updates['full_name'] = payload.full_name
    if updates:
        db.users.update_one({'_id': __import__('bson').ObjectId(user['id'])}, {'$set': updates})
        user.update(updates)
    return user


def change_user_password(db: Database, user: dict, payload: PasswordChange) -> None:
    stored = db.users.find_one({'_id': __import__('bson').ObjectId(user['id'])})
    if not stored or not verify_password(payload.current_password, stored['hashed_password']):
        raise ValueError('Current password is incorrect')
    db.users.update_one({'_id': stored['_id']}, {'$set': {'hashed_password': hash_password(payload.new_password)}})


def delete_user_account(db: Database, user: dict) -> None:
    db.prediction_history.delete_many({'user_id': user['id']})
    db.training_history.delete_many({'user_id': user['id']})
    db.users.delete_one({'_id': __import__('bson').ObjectId(user['id'])})
