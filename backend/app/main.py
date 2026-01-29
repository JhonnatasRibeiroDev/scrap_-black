from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json
import os
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
import subprocess
from datetime import datetime


class GenerateRequest(BaseModel):
    selected_flows: Optional[List[str]] = None

app = FastAPI(title="Borde API", version="0.1.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminhos
FLOWS_FILE = "/data/flows.json"
OUTPUT_DIR = "/output"
os.makedirs(OUTPUT_DIR, exist_ok=True)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/greet")
def greet(name: str = "mundo") -> dict:
    return {"message": f"Olá, {name}!"}


def generate_stable_id(flow: Dict) -> str:
    """Gera ID estável baseado no método, URL e timestamp."""
    key = f"{flow.get('method', '')}:{flow.get('url', '')}:{flow.get('timestamp', '')}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


@app.get("/flows")
def list_flows() -> Dict[str, Any]:
    """Lista todos os flows capturados pelo mitmproxy."""
    flows_file = "/data/flows.json"
    
    if not os.path.exists(flows_file):
        return {"flows": [], "total": 0, "message": "Nenhum flow capturado ainda"}
    
    try:
        with open(flows_file, 'r') as f:
            flows = json.load(f)
        
        # Filtrar apenas requisições para APIs (não recursos estáticos)
        api_flows = []
        for flow in flows:
            url = flow.get('url', '')
            if not any(ext in url for ext in ['.js', '.css', '.png', '.jpg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf']):
                # Usar ID estável
                flow['id'] = generate_stable_id(flow)
                api_flows.append(flow)
        
        return {"flows": api_flows, "total": len(api_flows)}
    except Exception as e:
        return {"flows": [], "total": 0, "error": str(e)}


@app.post("/generate-openapi")
def generate_openapi(request: GenerateRequest) -> Dict[str, Any]:
    """Gera OpenAPI a partir dos flows selecionados."""
    try:
        selected_ids = set(request.selected_flows or [])
        
        # Se houver seleção, filtrar flows
        if selected_ids:
            with open(FLOWS_FILE, 'r') as f:
                all_flows = json.load(f)
            
            # Filtrar apenas flows selecionados
            filtered_flows = []
            for flow in all_flows:
                flow_id = generate_stable_id(flow)
                if flow_id in selected_ids:
                    filtered_flows.append(flow)
            
            # Criar arquivo temporário com flows filtrados
            temp_file = os.path.join(OUTPUT_DIR, "temp_flows.json")
            with open(temp_file, 'w') as f:
                json.dump(filtered_flows, f)
            
            input_file = temp_file
        else:
            input_file = FLOWS_FILE
        
        output_file = os.path.join(OUTPUT_DIR, f"openapi-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        
        # Ler flows e gerar OpenAPI manualmente (mais confiável)
        with open(input_file, 'r') as f:
            flows = json.load(f)
        
        openapi = generate_openapi_from_flows(flows)
        
        with open(output_file, 'w') as f:
            json.dump(openapi, f, indent=2)
        
        # Também salvar como latest
        latest_file = os.path.join(OUTPUT_DIR, "openapi-latest.json")
        with open(latest_file, 'w') as f:
            json.dump(openapi, f, indent=2)
        
        return {
            "success": True,
            "message": f"OpenAPI gerado com {len(flows)} endpoints",
            "file": os.path.basename(output_file),
            "path": output_file
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/generate-postman")
def generate_postman(request: GenerateRequest) -> Dict[str, Any]:
    """Gera coleção Postman a partir dos flows selecionados."""
    try:
        selected_ids = set(request.selected_flows or [])
        
        # Filtrar flows selecionados
        with open(FLOWS_FILE, 'r') as f:
            all_flows = json.load(f)
        
        if selected_ids:
            flows = [f for f in all_flows if generate_stable_id(f) in selected_ids]
        else:
            flows = all_flows
        
        # Gerar coleção Postman diretamente dos flows
        postman_collection = generate_postman_from_flows(flows)
        
        postman_file = os.path.join(OUTPUT_DIR, f"postman-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(postman_file, 'w') as f:
            json.dump(postman_collection, f, indent=2)
        
        return {
            "success": True,
            "message": f"Coleção Postman gerada com {len(flows)} requests",
            "file": os.path.basename(postman_file),
            "path": postman_file
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


def generate_openapi_from_flows(flows: List[Dict]) -> Dict:
    """Gera OpenAPI 3.0 a partir dos flows capturados."""
    from urllib.parse import urlparse, parse_qs
    
    openapi = {
        "openapi": "3.0.0",
        "info": {
            "title": "API Capturada",
            "description": "API gerada automaticamente a partir de flows capturados",
            "version": "1.0.0"
        },
        "servers": [],
        "paths": {}
    }
    
    servers_set = set()
    
    for flow in flows:
        url = flow.get('url', '')
        method = flow.get('method', 'GET').lower()
        
        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        servers_set.add(base_url)
        
        path = parsed.path or '/'
        
        # Inicializar path se não existir
        if path not in openapi["paths"]:
            openapi["paths"][path] = {}
        
        # Evitar duplicatas de método
        if method in openapi["paths"][path]:
            continue
        
        # Criar operação
        operation = {
            "summary": f"{method.upper()} {path}",
            "description": f"Endpoint capturado: {url}",
            "parameters": [],
            "responses": {
                "200": {
                    "description": "Resposta bem-sucedida"
                }
            }
        }
        
        # Adicionar query parameters
        query_params = parse_qs(parsed.query)
        for param_name in query_params:
            operation["parameters"].append({
                "name": param_name,
                "in": "query",
                "required": False,
                "schema": {"type": "string"}
            })
        
        # Adicionar status da resposta capturada
        status = flow.get('status')
        if status and status != 200:
            operation["responses"][str(status)] = {
                "description": f"Resposta com status {status}"
            }
        
        openapi["paths"][path][method] = operation
    
    # Adicionar servers
    openapi["servers"] = [{"url": s} for s in sorted(servers_set)]
    
    return openapi


def generate_postman_from_flows(flows: List[Dict]) -> Dict:
    """Gera coleção Postman v2.1 diretamente dos flows."""
    from urllib.parse import urlparse, parse_qs
    
    collection = {
        "info": {
            "_postman_id": hashlib.md5(str(datetime.now()).encode()).hexdigest(),
            "name": "API Capturada",
            "description": "Coleção gerada automaticamente a partir de flows capturados",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [],
        "variable": []
    }
    
    # Agrupar por host
    hosts = {}
    for flow in flows:
        url = flow.get('url', '')
        parsed = urlparse(url)
        host = f"{parsed.scheme}://{parsed.netloc}"
        
        if host not in hosts:
            hosts[host] = []
        hosts[host].append(flow)
    
    # Adicionar variáveis de host
    for i, host in enumerate(sorted(hosts.keys())):
        var_name = f"baseUrl{i+1}" if i > 0 else "baseUrl"
        collection["variable"].append({
            "key": var_name,
            "value": host,
            "type": "string"
        })
    
    # Criar items para cada flow
    for flow in flows:
        url = flow.get('url', '')
        method = flow.get('method', 'GET')
        parsed = urlparse(url)
        
        # Criar URL com variável
        host = f"{parsed.scheme}://{parsed.netloc}"
        host_var = "baseUrl"
        for i, h in enumerate(sorted(hosts.keys())):
            if h == host:
                host_var = f"baseUrl{i+1}" if i > 0 else "baseUrl"
                break
        
        # Query params
        query = []
        for key, values in parse_qs(parsed.query).items():
            query.append({
                "key": key,
                "value": values[0] if values else ""
            })
        
        # Path segments
        path_segments = [seg for seg in parsed.path.split('/') if seg]
        
        item = {
            "name": f"{method} {parsed.path or '/'}",
            "request": {
                "method": method,
                "header": [],
                "url": {
                    "raw": f"{{{{host_var}}}}{parsed.path}{'?' + parsed.query if parsed.query else ''}",
                    "host": [f"{{{{{host_var}}}}}"],
                    "path": path_segments,
                    "query": query if query else None
                }
            },
            "response": []
        }
        
        # Adicionar headers da request
        req_headers = flow.get('request', {}).get('headers', {})
        for key, value in req_headers.items():
            if key.lower() not in ['host', 'connection', 'accept-encoding', 'content-length']:
                item["request"]["header"].append({
                    "key": key,
                    "value": value
                })
        
        # Remover query se vazio
        if not item["request"]["url"]["query"]:
            del item["request"]["url"]["query"]
        
        collection["item"].append(item)
    
    return collection


def convert_openapi_to_postman(openapi: Dict) -> Dict:
    """Converte OpenAPI 3.0 para formato Postman Collection v2.1."""
    collection = {
        "info": {
            "name": openapi.get("info", {}).get("title", "API Collection"),
            "description": openapi.get("info", {}).get("description", ""),
            "version": openapi.get("info", {}).get("version", "1.0.0")
        },
        "item": [],
        "variable": []
    }
    
    # Adicionar variável base URL
    base_url = "http://localhost:8000"
    if "servers" in openapi and openapi["servers"]:
        base_url = openapi["servers"][0].get("url", base_url)
    
    collection["variable"].append({
        "key": "baseUrl",
        "value": base_url,
        "type": "string"
    })
    
    # Converter paths para items
    paths = openapi.get("paths", {})
    for path, methods in paths.items():
        for method, details in methods.items():
            if method.lower() in ["get", "post", "put", "delete", "patch", "head", "options"]:
                item = {
                    "name": details.get("summary", f"{method.upper()} {path}"),
                    "request": {
                        "method": method.upper(),
                        "url": {
                            "raw": "{{baseUrl}}" + path,
                            "host": ["{{baseUrl}}"],
                            "path": path.strip("/").split("/")
                        },
                        "header": [
                            {
                                "key": "Content-Type",
                                "value": "application/json"
                            }
                        ]
                    }
                }
                
                # Adicionar parâmetros
                if "parameters" in details:
                    item["request"]["url"]["query"] = []
                    for param in details["parameters"]:
                        if param.get("in") == "query":
                            item["request"]["url"]["query"].append({
                                "key": param.get("name"),
                                "value": "",
                                "disabled": True
                            })
                
                # Adicionar body
                if "requestBody" in details:
                    item["request"]["body"] = {
                        "mode": "raw",
                        "raw": json.dumps({}),
                        "options": {"raw": {"language": "json"}}
                    }
                
                collection["item"].append(item)
    
    return collection


@app.get("/download/{filename}")
def download_file(filename: str):
    """Download dos arquivos gerados."""
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    return FileResponse(file_path, filename=filename)
