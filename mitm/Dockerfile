FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir mitmproxy==10.3.0 mitmproxy2swagger==0.3.0

COPY scripts /app/scripts

RUN chmod +x /app/scripts/*.sh

EXPOSE 8080 8081

CMD ["mitmweb", "--web-host", "0.0.0.0", "--web-port", "8081", "--listen-host", "0.0.0.0", "--listen-port", "8080", "--set", "confdir=/data", "-w", "/data/flows.mitm"]
