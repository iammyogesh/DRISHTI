FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for OpenCV)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port (Hugging Face Spaces routes traffic to port 7860 by default)
ENV DRISHTI_ML_PORT=7860
ENV DRISHTI_ML_HOST=0.0.0.0
EXPOSE 7860

# Reduce memory fragmentation and limit thread contention for smaller instances
ENV MALLOC_ARENA_MAX=2
ENV OMP_NUM_THREADS=1

# Run the FastAPI service
CMD ["python", "service.py"]
