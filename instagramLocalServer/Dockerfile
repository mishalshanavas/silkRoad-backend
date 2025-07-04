FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install minimal OS packages for Pillow
RUN apt update && apt install -y \
    gcc \
    build-essential \
    libpq-dev \
    curl \
    zlib1g-dev \
    libjpeg-dev \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Copy dependencies first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy app code
COPY . .

# Expose FastAPI port
EXPOSE 7070

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7070"]