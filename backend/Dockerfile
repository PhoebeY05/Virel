FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini
COPY automation ./automation

WORKDIR /app/automation
RUN npm ci
RUN npx playwright install --with-deps chromium firefox

WORKDIR /app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:build_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
