FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

WORKDIR /app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:build_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
