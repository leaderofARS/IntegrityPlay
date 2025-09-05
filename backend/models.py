from __future__ import annotations
from datetime import datetime
from typing import Any
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

Base = declarative_base()


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(64), unique=True, index=True, nullable=False)
    score = Column(Float, nullable=True)
    anchored = Column(Boolean, default=False)
    evidence_path = Column(String(512), nullable=True)
    rule_flags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    signals = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "score": self.score,
            "anchored": self.anchored,
            "evidence_path": self.evidence_path,
            "rule_flags": self.rule_flags or {},
            "signals": self.signals or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(256), nullable=False)
    status = Column(String(32), default="open", nullable=False)
    priority = Column(String(16), default="medium", nullable=False)
    assignee = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    comments = relationship("CaseComment", back_populates="case", cascade="all, delete-orphan")
    links = relationship("AlertCase", back_populates="case", cascade="all, delete-orphan")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "case_id": self.case_id,
            "title": self.title,
            "status": self.status,
            "priority": self.priority,
            "assignee": self.assignee,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CaseComment(Base):
    __tablename__ = "case_comments"

    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    author = Column(String(128), nullable=True)
    text = Column(String(2000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="comments")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "case_id": self.case_id,
            "author": self.author,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AlertCase(Base):
    __tablename__ = "alert_cases"

    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    alert_id = Column(String(64), nullable=False)

    case = relationship("Case", back_populates="links")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    object_type = Column(String(64), nullable=False)
    object_id = Column(String(128), nullable=False)
    action = Column(String(64), nullable=False)
    actor = Column(String(128), nullable=True)
    details = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "object_type": self.object_type,
            "object_id": self.object_id,
            "action": self.action,
            "actor": self.actor,
            "details": self.details or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

