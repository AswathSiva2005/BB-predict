from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
MAX_BCRYPT_PASSWORD_BYTES = 72


def _password_fits_bcrypt(password: str) -> bool:
    return len(password.encode('utf-8')) <= MAX_BCRYPT_PASSWORD_BYTES


def hash_password(password: str) -> str:
    if not _password_fits_bcrypt(password):
        raise ValueError('Password must not exceed 72 UTF-8 bytes.')
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not _password_fits_bcrypt(plain_password):
        return False
    return pwd_context.verify(plain_password, hashed_password)
