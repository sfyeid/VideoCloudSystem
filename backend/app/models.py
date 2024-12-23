from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base

class Video(Base):
    __tablename__ = 'videos'

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, unique=True)  # Сделать уникальным
    cloud_path = Column(String)  # Добавим это поле для хранения пути к видео в облаке
    uploaded_at = Column(DateTime, default=func.now())  # Здесь нужно использовать func.now(), чтобы автоматически заполнялось время загрузки
