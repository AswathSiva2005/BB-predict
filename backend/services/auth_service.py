from sqlalchemy.orm import Session

from backend.auth.jwt import create_access_token
from backend.auth.schemas import PasswordChange, TokenResponse, UserCreate, UserUpdate
from backend.models.user import User
from backend.utils.security import hash_password, verify_password


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower()).first()

    if not user or not verify_password(password, user.hashed_password):
        return None

    return user


def build_token_response(user: User) -> TokenResponse:
    token = create_access_token(subject=user.email)
    return TokenResponse(access_token=token)


def update_user_profile(db: Session, user: User, payload: UserUpdate) -> User:
    if payload.email and payload.email.lower() != user.email:
        existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
        if existing_user and existing_user.id != user.id:
            raise ValueError('Email already registered')
        user.email = payload.email.lower()

    if payload.full_name:
        user.full_name = payload.full_name

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_user_password(db: Session, user: User, payload: PasswordChange) -> None:
    if not verify_password(payload.current_password, user.hashed_password):
        raise ValueError('Current password is incorrect')

    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    db.commit()


def delete_user_account(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
