from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from backend.database.base import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    prediction_histories = relationship('PredictionHistory', back_populates='user', cascade='all, delete-orphan')
    training_histories = relationship('TrainingHistory', back_populates='user', cascade='all, delete-orphan')
