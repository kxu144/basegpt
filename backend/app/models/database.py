from sqlalchemy import Column, String, DateTime
from app.utils.database import Base

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True)
    title = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)