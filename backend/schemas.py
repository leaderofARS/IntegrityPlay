from __future__ import annotations
from typing import Any, Optional, List
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str


# Cases
class CaseCreate(BaseModel):
    title: str
    priority: str = Field(default="medium")
    assignee: Optional[str] = None

class CaseBase(BaseModel):
    case_id: str
    title: str
    status: str
    priority: str
    assignee: Optional[str] = None
    created_at: Optional[str] = None

class CaseListResponse(BaseModel):
    total: int
    items: List[CaseBase]

class CaseAssignRequest(BaseModel):
    assignee: str

class CaseCommentRequest(BaseModel):
    author: Optional[str] = None
    text: str


class RunDemoRequest(BaseModel):
    scenario: str = Field(default="wash_trade")
    speed: float = Field(default=5.0, ge=0.1, le=50.0)
    duration: int = Field(default=20, ge=1, le=120)
    no_throttle: bool = Field(default=True)
    randomize_scores: bool = Field(default=False)


class RunDemoResponse(BaseModel):
    task_id: str
    message: str


class AlertBase(BaseModel):
    alert_id: str
    score: Optional[float] = None
    anchored: bool = False
    evidence_path: Optional[str] = None
    rule_flags: dict[str, Any] = {}
    signals: dict[str, Any] = {}
    created_at: Optional[str] = None


class AlertListResponse(BaseModel):
    total: int
    items: List[AlertBase]


class AlertsQuery(BaseModel):
    page: int = 1
    page_size: int = 20
    anchored: Optional[bool] = None
    min_score: Optional[float] = None


class IngestRequest(BaseModel):
    events: Optional[List[dict[str, Any]]] = None
    events_jsonl_path: Optional[str] = None
    run_detector: bool = True
    anchor: bool = True
    no_throttle: bool = True
    randomize_scores: bool = False


class IngestResponse(BaseModel):
    alerts_emitted: int


class DownloadPackResponse(BaseModel):
    filename: str
    size_bytes: int

