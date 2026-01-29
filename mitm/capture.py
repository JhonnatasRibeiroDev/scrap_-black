#!/usr/bin/env python3
"""
Script para converter flows.mitm binário para JSON
Executado periodicamente para sincronizar os dados
"""
import json
import os
import time
from pathlib import Path

def convert_flows_mitm_to_json():
    """Converte arquivo flows.mitm para JSON"""
    mitm_file = "/data/flows.mitm"
    json_file = "/data/flows.json"
    
    try:
        from mitmproxy.io import FlowReader
        
        flows_list = []
        
        if os.path.exists(mitm_file) and os.path.getsize(mitm_file) > 0:
            with open(mitm_file, 'rb') as f:
                reader = FlowReader(f)
                for flow in reader.stream():
                    if hasattr(flow, 'request') and hasattr(flow, 'response'):
                        flow_data = {
                            "id": str(id(flow)),
                            "method": flow.request.method,
                            "url": flow.request.pretty_url,
                            "status": flow.response.status_code if flow.response else None,
                            "timestamp": str(flow.request.timestamp_start),
                            "request": {
                                "method": flow.request.method,
                                "url": flow.request.pretty_url,
                                "headers": dict(flow.request.headers),
                                "content_length": len(flow.request.content) if flow.request.content else 0
                            },
                            "response": {
                                "status_code": flow.response.status_code if flow.response else None,
                                "content_type": flow.response.headers.get("content-type", "") if flow.response else "",
                                "content_length": len(flow.response.content) if flow.response and flow.response.content else 0
                            }
                        }
                        flows_list.append(flow_data)
        
        # Salvar como JSON
        with open(json_file, 'w') as f:
            json.dump(flows_list, f, indent=2, default=str)
        
        print(f"✓ Convertido: {len(flows_list)} flows salvos em {json_file}")
        return True
    except Exception as e:
        print(f"✗ Erro ao converter: {e}")
        return False

if __name__ == "__main__":
    # Executar continuamente
    while True:
        convert_flows_mitm_to_json()
        time.sleep(2)  # Atualizar a cada 2 segundos

