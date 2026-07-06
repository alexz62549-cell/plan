from __future__ import annotations

import shutil
import subprocess
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, date as DateType, datetime
import os
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from .dictation_config import DICTATION_CONFIG


DEFAULT_CHILDREN = ["\u5b89\u5b89", "\u4e50\u4e50"]


def now_utc() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Child(Base):
    __tablename__ = "children"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    homework_items: Mapped[list["HomeworkItem"]] = relationship(back_populates="child")


class HomeworkItem(Base):
    __tablename__ = "homework_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"), nullable=False)
    date: Mapped[DateType] = mapped_column(Date, nullable=False)
    subject: Mapped[str] = mapped_column(String(60), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    subject_order: Mapped[int] = mapped_column(Integer, default=0)
    item_order: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    child: Mapped[Child] = relationship(back_populates="homework_items")
    photos: Mapped[list["Photo"]] = relationship(back_populates="homework_item", cascade="all, delete-orphan")
    dictation: Mapped["DictationAssignment | None"] = relationship(back_populates="homework_item", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    homework_item_id: Mapped[int] = mapped_column(ForeignKey("homework_items.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(300), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(200), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    homework_item: Mapped[HomeworkItem] = relationship(back_populates="photos")


class DictationAssignment(Base):
    __tablename__ = "dictation_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    homework_item_id: Mapped[int] = mapped_column(ForeignKey("homework_items.id"), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    homework_item: Mapped[HomeworkItem] = relationship(back_populates="dictation")
    words: Mapped[list["DictationWord"]] = relationship(back_populates="assignment", cascade="all, delete-orphan")


class DictationWord(Base):
    __tablename__ = "dictation_words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("dictation_assignments.id"), nullable=False)
    word: Mapped[str] = mapped_column(String(120), nullable=False)
    hint: Mapped[str | None] = mapped_column(String(160), nullable=True)
    audio_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    word_order: Mapped[int] = mapped_column(Integer, default=0)

    assignment: Mapped[DictationAssignment] = relationship(back_populates="words")


class ImportItem(BaseModel):
    subject: str = Field(min_length=1)
    content: str = Field(min_length=1)


class ImportDay(BaseModel):
    date: DateType
    items: list[ImportItem]


class ImportChild(BaseModel):
    name: str = Field(min_length=1)
    days: list[ImportDay]


class ImportPayload(BaseModel):
    children: list[ImportChild]


class HomeworkCreate(BaseModel):
    child_id: int
    date: DateType
    subject: str = Field(min_length=1)
    content: str = Field(min_length=1)


class HomeworkUpdate(BaseModel):
    child_id: int | None = None
    date: DateType | None = None
    subject: str | None = None
    content: str | None = None
    subject_order: int | None = None
    item_order: int | None = None


class CompletionUpdate(BaseModel):
    is_completed: bool


class ChildUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class DictationWordCreate(BaseModel):
    word: str = Field(min_length=1, max_length=120)
    hint: str | None = Field(default=None, max_length=160)


class DictationCreate(BaseModel):
    child_id: int
    date: DateType
    title: str = Field(min_length=1, max_length=120)
    words: list[DictationWordCreate] = Field(min_length=1)


def item_status(item: HomeworkItem) -> str:
    if item.is_completed:
        return "completed"
    if item.photos:
        return "pending_confirmation"
    return "not_submitted"


def serialize_photo(photo: Photo) -> dict[str, Any]:
    photo_url = photo.file_path.replace("\\", "/")
    return {
        "id": photo.id,
        "url": f"/uploads/{photo_url}",
        "original_filename": photo.original_filename,
        "file_size": photo.file_size,
        "created_at": photo.created_at.isoformat(),
    }


def serialize_dictation(assignment: DictationAssignment | None, *, include_answers: bool = False) -> dict[str, Any] | None:
    if not assignment:
        return None
    words = []
    for index, word in enumerate(sorted(assignment.words, key=lambda item: (item.word_order, item.id))):
        audio_url = None
        if word.audio_path:
            audio_path = word.audio_path.replace("\\", "/")
            audio_url = f"/uploads/{audio_path}"
        payload: dict[str, Any] = {
            "index": index,
            "audio_url": audio_url,
            "speech_text": word.word,
        }
        if include_answers:
            payload["word"] = word.word
            payload["hint"] = word.hint
        words.append(payload)
    return {
        "id": assignment.id,
        "title": assignment.title,
        "config": DICTATION_CONFIG,
        "words": words,
    }


def serialize_item(item: HomeworkItem) -> dict[str, Any]:
    payload = {
        "id": item.id,
        "child_id": item.child_id,
        "child_name": item.child.name,
        "date": item.date.isoformat(),
        "subject": item.subject,
        "content": item.content,
        "is_completed": item.is_completed,
        "status": item_status(item),
        "photo_count": len(item.photos),
        "photos": [serialize_photo(photo) for photo in item.photos],
        "subject_order": item.subject_order,
        "item_order": item.item_order,
    }
    dictation = serialize_dictation(item.dictation)
    if dictation:
        payload["dictation"] = dictation
    return payload


def group_by_subject(items: list[HomeworkItem]) -> list[dict[str, Any]]:
    groups: dict[str, dict[str, Any]] = {}
    for item in items:
        if item.subject not in groups:
            groups[item.subject] = {
                "subject": item.subject,
                "subject_order": item.subject_order,
                "items": [],
            }
        groups[item.subject]["items"].append(serialize_item(item))
    return sorted(groups.values(), key=lambda group: (group["subject_order"], group["subject"]))


def generate_dictation_audio_file(word: str, hint: str | None, upload_root: Path) -> str | None:
    if not DICTATION_CONFIG["generate_audio_on_save"]:
        return None
    relative_dir = Path("dictation") / "audio"
    target_dir = upload_root / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.mp3"
    relative_path = relative_dir / filename
    target_path = upload_root / relative_path
    text_parts = []
    if DICTATION_CONFIG["play_hint"] and DICTATION_CONFIG["hint_before_word"] and hint:
        text_parts.append(hint)
    text_parts.append(word)
    if DICTATION_CONFIG["play_hint"] and not DICTATION_CONFIG["hint_before_word"] and hint:
        text_parts.append(hint)
    text = ". ".join(text_parts)
    try:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "edge_tts",
                "--voice",
                str(DICTATION_CONFIG["english_voice"]),
                f"--rate={DICTATION_CONFIG['english_rate']}",
                "--text",
                text,
                "--write-media",
                str(target_path),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    return relative_path.as_posix()


def create_app(
    database_url: str = "sqlite:///./data/homework.db",
    upload_dir: str | Path = "./data/uploads",
    admin_password: str = "123456",
    frontend_dist: str | Path | None = "./dist",
    dictation_audio_generator: Any | None = None,
) -> FastAPI:
    upload_root = Path(upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    audio_generator = dictation_audio_generator or (lambda word, hint: generate_dictation_audio_file(word, hint, upload_root))

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def require_admin(x_admin_password: str | None = Header(default=None)):
        if x_admin_password != admin_password:
            raise HTTPException(status_code=401, detail="Admin password required")

    def seed_children(db: Session) -> None:
        existing = db.scalars(select(Child)).all()
        if existing:
            return
        for index, name in enumerate(DEFAULT_CHILDREN):
            db.add(Child(name=name, display_order=index))
        db.commit()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        with SessionLocal() as db:
            seed_children(db)
        yield

    app = FastAPI(title="Summer Homework Check-in", lifespan=lifespan)
    app.state.dictation_audio_generator = audio_generator
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount("/uploads", StaticFiles(directory=upload_root), name="uploads")

    def get_or_create_child(db: Session, name: str) -> Child:
        child = db.scalar(select(Child).where(Child.name == name))
        if child:
            return child
        next_order = db.scalar(select(func.coalesce(func.max(Child.display_order), -1))) + 1
        child = Child(name=name, display_order=next_order)
        db.add(child)
        db.commit()
        db.refresh(child)
        return child

    @app.get("/api/children")
    def list_children(db: Session = Depends(get_db)):
        seed_children(db)
        children = db.scalars(select(Child).order_by(Child.display_order, Child.id)).all()
        return [{"id": child.id, "name": child.name, "display_order": child.display_order} for child in children]

    @app.patch("/api/admin/children/{child_id}", dependencies=[Depends(require_admin)])
    def update_child(child_id: int, payload: ChildUpdate, db: Session = Depends(get_db)):
        child = db.get(Child, child_id)
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")
        existing = db.scalar(select(Child).where(Child.name == payload.name, Child.id != child_id))
        if existing:
            raise HTTPException(status_code=409, detail="Child name already exists")
        child.name = payload.name
        db.commit()
        db.refresh(child)
        return {"id": child.id, "name": child.name, "display_order": child.display_order}

    @app.get("/api/homework")
    def get_homework(childId: int, date: DateType, db: Session = Depends(get_db)):
        child = db.get(Child, childId)
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")
        items = db.scalars(
            select(HomeworkItem)
            .where(HomeworkItem.child_id == childId, HomeworkItem.date == date)
            .order_by(HomeworkItem.subject_order, HomeworkItem.subject, HomeworkItem.item_order, HomeworkItem.id)
        ).all()
        return {
            "child": {"id": child.id, "name": child.name},
            "date": date.isoformat(),
            "subjects": group_by_subject(items),
            "summary": {
                "total": len(items),
                "completed": sum(1 for item in items if item.is_completed),
                "pending": sum(1 for item in items if item.photos and not item.is_completed),
            },
        }

    @app.post("/api/admin/import/preview")
    def preview_import(payload: ImportPayload):
        rows = []
        for child in payload.children:
            for day in child.days:
                for index, item in enumerate(day.items):
                    rows.append(
                        {
                            "child_name": child.name,
                            "date": day.date.isoformat(),
                            "subject": item.subject,
                            "content": item.content,
                            "item_order": index,
                        }
                    )
        return {"valid": True, "item_count": len(rows), "rows": rows}

    @app.post("/api/admin/import", dependencies=[Depends(require_admin)])
    def import_plan(payload: ImportPayload, db: Session = Depends(get_db)):
        created = 0
        for child_payload in payload.children:
            child = get_or_create_child(db, child_payload.name)
            for day in child_payload.days:
                subject_order: dict[str, int] = {}
                for index, item_payload in enumerate(day.items):
                    subject_order.setdefault(item_payload.subject, len(subject_order))
                    db.add(
                        HomeworkItem(
                            child_id=child.id,
                            date=day.date,
                            subject=item_payload.subject,
                            content=item_payload.content,
                            subject_order=subject_order[item_payload.subject],
                            item_order=index,
                        )
                    )
                    created += 1
        db.commit()
        return {"created": created}

    @app.post("/api/admin/homework", dependencies=[Depends(require_admin)])
    def create_homework(payload: HomeworkCreate, db: Session = Depends(get_db)):
        if not db.get(Child, payload.child_id):
            raise HTTPException(status_code=404, detail="Child not found")
        next_order = db.scalar(
            select(func.coalesce(func.max(HomeworkItem.item_order), -1)).where(
                HomeworkItem.child_id == payload.child_id,
                HomeworkItem.date == payload.date,
                HomeworkItem.subject == payload.subject,
            )
        ) + 1
        subject_order = db.scalar(
            select(func.coalesce(func.min(HomeworkItem.subject_order), 0)).where(
                HomeworkItem.child_id == payload.child_id,
                HomeworkItem.date == payload.date,
                HomeworkItem.subject == payload.subject,
            )
        )
        item = HomeworkItem(
            child_id=payload.child_id,
            date=payload.date,
            subject=payload.subject,
            content=payload.content,
            subject_order=subject_order,
            item_order=next_order,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_item(item)

    @app.post("/api/admin/dictation", dependencies=[Depends(require_admin)])
    def create_dictation(payload: DictationCreate, db: Session = Depends(get_db)):
        if not db.get(Child, payload.child_id):
            raise HTTPException(status_code=404, detail="Child not found")
        subject = "\u5916\u8bed"
        next_order = db.scalar(
            select(func.coalesce(func.max(HomeworkItem.item_order), -1)).where(
                HomeworkItem.child_id == payload.child_id,
                HomeworkItem.date == payload.date,
                HomeworkItem.subject == subject,
            )
        ) + 1
        subject_order = db.scalar(
            select(func.coalesce(func.min(HomeworkItem.subject_order), 2)).where(
                HomeworkItem.child_id == payload.child_id,
                HomeworkItem.date == payload.date,
                HomeworkItem.subject == subject,
            )
        )
        item = HomeworkItem(
            child_id=payload.child_id,
            date=payload.date,
            subject=subject,
            content=payload.title,
            subject_order=subject_order,
            item_order=next_order,
        )
        assignment = DictationAssignment(title=payload.title, homework_item=item)
        for index, word_payload in enumerate(payload.words):
            assignment.words.append(
                DictationWord(
                    word=word_payload.word.strip(),
                    hint=word_payload.hint.strip() if word_payload.hint else None,
                    audio_path=app.state.dictation_audio_generator(word_payload.word.strip(), word_payload.hint.strip() if word_payload.hint else None),
                    word_order=index,
                )
            )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_item(item)

    @app.post("/api/admin/dictation/{item_id}/audio", dependencies=[Depends(require_admin)])
    def regenerate_dictation_audio(item_id: int, db: Session = Depends(get_db)):
        item = db.get(HomeworkItem, item_id)
        if not item or not item.dictation:
            raise HTTPException(status_code=404, detail="Dictation not found")
        updated = 0
        failed = 0
        for word in sorted(item.dictation.words, key=lambda value: (value.word_order, value.id)):
            audio_path = app.state.dictation_audio_generator(word.word, word.hint)
            if audio_path:
                word.audio_path = audio_path
                updated += 1
            else:
                failed += 1
        db.commit()
        db.refresh(item)
        return {"updated": updated, "failed": failed, "item": serialize_item(item)}

    @app.patch("/api/admin/homework/{item_id}", dependencies=[Depends(require_admin)])
    def update_homework(item_id: int, payload: HomeworkUpdate, db: Session = Depends(get_db)):
        item = db.get(HomeworkItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Homework item not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return serialize_item(item)

    @app.delete("/api/admin/homework/{item_id}", dependencies=[Depends(require_admin)])
    def delete_homework(item_id: int, db: Session = Depends(get_db)):
        item = db.get(HomeworkItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Homework item not found")
        db.delete(item)
        db.commit()
        return {"deleted": True}

    @app.patch("/api/admin/homework/{item_id}/completion", dependencies=[Depends(require_admin)])
    def update_completion(item_id: int, payload: CompletionUpdate, db: Session = Depends(get_db)):
        item = db.get(HomeworkItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Homework item not found")
        item.is_completed = payload.is_completed
        db.commit()
        db.refresh(item)
        return serialize_item(item)

    @app.post("/api/homework/{item_id}/photos")
    def upload_photo(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
        item = db.get(HomeworkItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Homework item not found")
        if item.is_completed:
            raise HTTPException(status_code=409, detail="Completed homework is locked")

        suffix = Path(file.filename or "photo.jpg").suffix.lower() or ".jpg"
        relative_dir = Path(str(item.child_id)) / item.date.isoformat() / str(item.id)
        target_dir = upload_root / relative_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{suffix}"
        relative_path = relative_dir / filename
        target_path = upload_root / relative_path
        with target_path.open("wb") as output:
            shutil.copyfileobj(file.file, output)
        photo = Photo(
            homework_item_id=item.id,
            file_path=relative_path.as_posix(),
            original_filename=file.filename or filename,
            file_size=target_path.stat().st_size,
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)
        return serialize_photo(photo)

    @app.delete("/api/photos/{photo_id}")
    def delete_photo(photo_id: int, db: Session = Depends(get_db)):
        photo = db.get(Photo, photo_id)
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        if photo.homework_item.is_completed:
            raise HTTPException(status_code=409, detail="Completed homework is locked")
        path = upload_root / photo.file_path
        if path.exists():
            path.unlink()
        db.delete(photo)
        db.commit()
        return {"deleted": True}

    @app.get("/api/dictation/{item_id}/answers")
    def dictation_answers(item_id: int, db: Session = Depends(get_db)):
        item = db.get(HomeworkItem, item_id)
        if not item or not item.dictation:
            raise HTTPException(status_code=404, detail="Dictation not found")
        return serialize_dictation(item.dictation, include_answers=True)

    @app.get("/api/admin/date", dependencies=[Depends(require_admin)])
    def admin_date(date: DateType, db: Session = Depends(get_db)):
        children = db.scalars(select(Child).order_by(Child.display_order, Child.id)).all()
        result = []
        for child in children:
            items = db.scalars(
                select(HomeworkItem)
                .where(HomeworkItem.child_id == child.id, HomeworkItem.date == date)
                .order_by(HomeworkItem.subject_order, HomeworkItem.subject, HomeworkItem.item_order, HomeworkItem.id)
            ).all()
            result.append({"child": {"id": child.id, "name": child.name}, "subjects": group_by_subject(items)})
        return {"date": date.isoformat(), "children": result}

    @app.get("/api/admin/month", dependencies=[Depends(require_admin)])
    def admin_month(year: int, month: int, db: Session = Depends(get_db)):
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
        start = DateType(year, month, 1)
        next_month = DateType(year + 1, 1, 1) if month == 12 else DateType(year, month + 1, 1)
        items = db.scalars(
            select(HomeworkItem)
            .where(HomeworkItem.date >= start, HomeworkItem.date < next_month)
            .order_by(HomeworkItem.date, HomeworkItem.child_id, HomeworkItem.subject_order, HomeworkItem.item_order)
        ).all()
        days: dict[str, dict[str, int | str]] = {}
        for item in items:
            key = item.date.isoformat()
            if key not in days:
                days[key] = {"date": key, "total": 0, "completed": 0, "pending": 0}
            days[key]["total"] = int(days[key]["total"]) + 1
            if item.is_completed:
                days[key]["completed"] = int(days[key]["completed"]) + 1
            elif item.photos:
                days[key]["pending"] = int(days[key]["pending"]) + 1
        return {"year": year, "month": month, "days": list(days.values())}

    @app.get("/api/admin/plan", dependencies=[Depends(require_admin)])
    def admin_plan(start: DateType, end: DateType, db: Session = Depends(get_db)):
        if end < start:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        items = db.scalars(
            select(HomeworkItem)
            .where(HomeworkItem.date >= start, HomeworkItem.date <= end)
            .order_by(HomeworkItem.date, HomeworkItem.child_id, HomeworkItem.subject_order, HomeworkItem.subject, HomeworkItem.item_order, HomeworkItem.id)
        ).all()
        return [serialize_item(item) for item in items]

    @app.get("/api/admin/pending", dependencies=[Depends(require_admin)])
    def pending_review(db: Session = Depends(get_db)):
        items = db.scalars(
            select(HomeworkItem)
            .join(Photo)
            .where(HomeworkItem.is_completed == False)  # noqa: E712
            .group_by(HomeworkItem.id)
            .order_by(HomeworkItem.date, HomeworkItem.child_id, HomeworkItem.subject_order, HomeworkItem.item_order)
        ).all()
        return [serialize_item(item) for item in items]

    if frontend_dist:
        dist_root = Path(frontend_dist)
        assets_root = dist_root / "assets"
        if assets_root.exists():
            app.mount("/assets", StaticFiles(directory=assets_root), name="assets")

        @app.get("/{full_path:path}")
        def serve_frontend(full_path: str):
            requested = dist_root / full_path
            if full_path and requested.exists() and requested.is_file():
                return FileResponse(requested)
            index_file = dist_root / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
            raise HTTPException(status_code=404, detail="Frontend build not found")

    return app


app = create_app(
    database_url=os.getenv("HOMEWORK_DATABASE_URL", "sqlite:///./data/homework.db"),
    upload_dir=os.getenv("HOMEWORK_UPLOAD_DIR", "./data/uploads"),
    admin_password=os.getenv("HOMEWORK_ADMIN_PASSWORD", "123456"),
    frontend_dist=os.getenv("HOMEWORK_FRONTEND_DIST", "./dist"),
)
