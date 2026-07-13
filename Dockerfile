# Stage 1: Build the frontend with Node.js and Vite
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Install Python dependencies
FROM python:3.11-slim AS backend-builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/app/deps -r requirements.txt

# Stage 3: Final runtime environment
FROM python:3.11-slim
WORKDIR /app

# Copy Python dependencies
COPY --from=backend-builder /app/deps /app/deps
ENV PYTHONPATH=/app/deps

# Copy Python backend code
COPY app/ ./app/

# Copy the built Vite frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
ENV PORT=8080
EXPOSE 8080

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
