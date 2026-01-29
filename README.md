# Borde Sync Stack

Stack simples com frontend, backend e um serviço de captura via mitmproxy2swagger para gerar OpenAPI a partir do tráfego.

## Subir o ambiente

```bash
docker compose up --build
```

- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000
- Proxy MITM: http://localhost:8080
- Mitmweb UI: http://localhost:8081

## Gerar OpenAPI

Após capturar tráfego (arquivo `/data/flows.mitm`), rode:

```bash
docker compose exec mitm /app/scripts/gen_openapi_from_flows.sh /data/flows.mitm /data/openapi.yaml
```

Ou gere a partir de um HAR colocado em `mitm/input/traffic.har`:

```bash
docker compose exec mitm /app/scripts/gen_openapi_from_har.sh /input/traffic.har /data/openapi.yaml
```
