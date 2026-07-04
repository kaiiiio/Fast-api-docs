# Dockerizing FastAPI: Minimal Guide

## Core Commands
*   **Dockerfile:** Create your environment (Install dependencies, Copy code, Start Gunicorn).
*   **Gunicorn:** Recommended for production. Uses **UvicornWorker** to handle async FastAPI.
*   **Command:** `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app` (e.g., 4 workers).

## Docker Best Practices
- ✅ Use **Python-slim** or **Alpine** base images to keep file size small.
- ✅ Use **Multi-stage builds** to install build tools (e.g., `gcc`, `libpq`) and only copy the resulting wheels/binaries to the final production image.
- ✅ Never store **Secrets** in the image; use **ENV** vars or `.env` files.
- ✅ Use **`uvicorn.workers.UvicornWorker`** for async production performance.

## Summary Checklist
- ✅ Slim base image
- ✅ Multi-stage build (if compiled dependencies)
- ✅ Gunicorn + UvicornWorker
- ✅ Environment-based config
