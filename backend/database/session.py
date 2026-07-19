from pymongo import ASCENDING, MongoClient
from pymongo.database import Database

from backend.utils.config import MONGODB_DATABASE, MONGODB_URL

client = MongoClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=20000,
    socketTimeoutMS=30000,
    retryReads=True,
    retryWrites=True,
    connect=False,
)
database: Database = client[MONGODB_DATABASE]


def get_database() -> Database:
    return database


def init_db() -> None:
    """Verify the MongoDB connection and create indexes used by the API."""
    client.admin.command('ping')
    database.users.create_index([('email', ASCENDING)], unique=True)
    database.prediction_history.create_index([('user_id', ASCENDING), ('created_at', -1)])
    database.training_history.create_index([('user_id', ASCENDING), ('created_at', -1)])
