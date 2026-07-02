from sqlalchemy import Column, Date, Float, Integer, String

from backend.database.base import Base


class StockObservation(Base):
    __tablename__ = 'stock_observations'

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), index=True, nullable=False)
    observation_date = Column(Date, index=True, nullable=False)
    open_price = Column(Float, nullable=True)
    high_price = Column(Float, nullable=True)
    low_price = Column(Float, nullable=True)
    close_price = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
