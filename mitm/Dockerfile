FROM python:3.10

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    libffi-dev \
    libssl-dev \
    ca-certificates \
  && pip install --upgrade pip \
  && pip install --no-cache-dir 'werkzeug<3.0' mitmproxy==8.1.1 mitmproxy2swagger==0.3.0 \
  && rm -rf /var/lib/apt/lists/*

COPY scripts /app/scripts
RUN chmod +x /app/scripts/*.sh

EXPOSE 8080 8081

CMD ["mitmweb", "--web-host", "0.0.0.0", "--web-port", "8081", "--listen-host", "0.0.0.0", "--listen-port", "8080", "--set", "confdir=/data", "-w", "/data/flows.mitm"]
