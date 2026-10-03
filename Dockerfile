FROM python:3.11-slim

# Build tools for any dependency that has to compile; libpq for Postgres.
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs the container as UID 1000, so the app must be
# able to write as that user (the model download creates models_artifacts/
# and the Hugging Face cache at runtime).
RUN useradd -m -u 1000 user

WORKDIR /app
RUN chown user:user /app

# Dependencies first so this layer is cached until requirements change.
# (The spaCy model download is intentionally absent: nothing in the API
# imports spaCy, and it is not in requirements_api.txt.)
COPY requirements_api.txt .
RUN pip install --no-cache-dir -r requirements_api.txt

# Everything else; see .dockerignore for what is left out. Model weights are
# not in the image -- api/download_models.py fetches them from the private
# Hugging Face repo (HF_TOKEN / HF_REPO_ID) on first start.
COPY --chown=user:user . .

USER user

# 7860 is the port Hugging Face Spaces expects. api/run.py reads $PORT, so
# this is set here rather than changing its default (8000), which local
# development and the frontends rely on.
ENV PORT=7860 \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["python", "-m", "api.run"]
