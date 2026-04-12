# Playwright base image includes matching Chromium; keep tag in sync with playwright in requirements.txt.
FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV EVIDENCE_DATA_DIR=/data/vaults
RUN mkdir -p /data/vaults

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
