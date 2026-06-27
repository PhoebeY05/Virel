from __future__ import annotations

import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_request_db, get_request_settings
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.errors import AppError
from app.schemas import MediaUploadRead

router = APIRouter(tags=["media"])


@router.post("/uploads/image", response_model=MediaUploadRead, status_code=201)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> MediaUploadRead:
    _ = db
    _ = current_user
    settings: Settings = get_request_settings(request)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise AppError("Only image uploads are supported", "INVALID_UPLOAD_TYPE", 400)

    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix.lower()
    if not extension:
        extension = mimetypes.guess_extension(file.content_type) or ".bin"

    filename = f"{uuid4().hex}{extension}"
    destination = media_dir / filename
    content = await file.read()
    destination.write_bytes(content)

    base_url = str(request.base_url).rstrip("/")
    return MediaUploadRead(
        url=f"{base_url}/media/{filename}",
        filename=filename,
        content_type=file.content_type,
        size=len(content),
    )
