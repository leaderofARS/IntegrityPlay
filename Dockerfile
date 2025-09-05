FROM python:3.10-slim

WORKDIR /app
COPY . /app

# Install bash for the demo script
RUN apt-get update && apt-get install -y --no-install-recommends bash && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Use bash explicitly to ensure the script runs even if not marked executable
CMD ["bash", "./scripts/run_demo.sh", "--no-throttle"]
