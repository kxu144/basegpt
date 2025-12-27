from datetime import datetime
from sqlalchemy import Boolean, Column, ForeignKey, Index, String, DateTime
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from app.utils.database import Base


class User(Base):
    __tablename__ = "users"
    email = Column(String, unique=True, primary_key=True)
    password_hash = Column(String, nullable=False)
    conversations = relationship("Conversation", back_populates="user")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True)
    user_email = Column(String, ForeignKey("users.email"), nullable=False)
    user = relationship("User", back_populates="conversations")
    title = Column(String)
    messages = relationship(
        "Message",
        back_populates="conversation",
        order_by="Message.created_at.asc()",
        lazy="selectin",
    )
    hidden = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    conversation = relationship("Conversation", back_populates="messages")
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    # tsvector index for full-text search
    content_tsv = Column(TSVECTOR)

    __table_args__ = (
        Index("idx_messages_conversation_id", "conversation_id", "created_at"),
        Index("idx_messages_ts_vector", "content_tsv", postgresql_using="gin"),
    )
