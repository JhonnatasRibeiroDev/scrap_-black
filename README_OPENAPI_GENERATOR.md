# Gerador de OpenAPI e Postman com Borde Stack

Agora você tem uma interface completa para capturar fluxos de API usando mitmproxy e gerar documentação automática em OpenAPI e Postman!

## 🎯 Funcionalidades

- ✅ **Captura de Fluxos**: Todos os requests/responses são capturados pelo mitmproxy
- ✅ **Interface Visual**: Visualize e selecione os fluxos que deseja documentar
- ✅ **Gerar OpenAPI**: Exporte como arquivo OpenAPI (JSON)
- ✅ **Gerar Postman**: Exporte como coleção Postman (pronto para importar)
- ✅ **Seleção Granular**: Escolha exatamente quais fluxos incluir

## 🚀 Como Usar

### 1. Acessar a Interface
- Abra seu navegador em: **http://localhost:3000**

### 2. Configurar Proxy no Navegador

#### Firefox:
1. Abra as Configurações (Preferences)
2. Vá para **Network Settings** → **Connection**
3. Selecione **Manual proxy configuration**
4. HTTP Proxy: `localhost` | Porta: `8080`
5. Clique em OK

#### Chrome:
1. Vá para Configurações → Privacidade e segurança → Segurança
2. Procure por **Proxy**
3. Configure proxy HTTP para `localhost:8080`

#### Safari:
1. Abra System Preferences
2. Vá para Network
3. Selecione sua rede
4. Clique em **Advanced** → **Proxies**
5. Ative **Web Proxy (HTTP)**: `localhost:8080`

### 3. Capturar Fluxos

1. Com o proxy configurado, navegue normalmente no seu site/aplicação
2. Faça login se necessário
3. Interaja com a API (clique em botões, envie formulários, etc.)
4. Todos os fluxos aparecerão na interface em tempo real

### 4. Gerar Documentação

#### Opção A: OpenAPI (Recomendado para documentação)
1. Selecione os fluxos que deseja documentar
2. Clique em **📄 Gerar OpenAPI (JSON)**
3. O arquivo será baixado automaticamente
4. Importe em ferramentas como Swagger UI, ReDoc, etc.

#### Opção B: Postman (Recomendado para testes)
1. Selecione os fluxos que deseja testar
2. Clique em **🔄 Gerar Postman (JSON)**
3. O arquivo será baixado automaticamente
4. No Postman: **File → Import → Selecione o arquivo**

### 5. Usar o Arquivo Postman

No Postman após importar:
1. A variável `{{baseUrl}}` estará configurada para `http://localhost:8000`
2. Todos os requests estarão prontos para testar
3. Você pode editar requests, adicionar testes, etc.

## 📋 Estrutura de Arquivos

```
/var/www/scrap-black/
├── backend/          # API FastAPI
│   └── app/main.py   # Endpoints para gerar OpenAPI/Postman
├── frontend/         # Interface Next.js
│   └── app/page.jsx  # Interface visual
├── mitm/            # Proxy mitmproxy
│   └── data/        # Fluxos capturados
└── output/          # Arquivos gerados
```

## 🔧 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/flows` | Lista todos os flows capturados |
| POST | `/generate-openapi` | Gera arquivo OpenAPI |
| POST | `/generate-postman` | Gera coleção Postman |
| GET | `/download/{filename}` | Download dos arquivos gerados |

## 📝 Exemplo de Resposta /flows

```json
{
  "flows": [
    {
      "id": "12345",
      "method": "GET",
      "url": "http://localhost:8000/api/users",
      "status": 200,
      "timestamp": "2024-01-29 14:30:00"
    },
    {
      "id": "12346",
      "method": "POST",
      "url": "http://localhost:8000/api/users",
      "status": 201,
      "timestamp": "2024-01-29 14:31:00"
    }
  ],
  "total": 2
}
```

## 🐛 Troubleshooting

### "502 Bad Gateway" no localhost:8080
- O proxy está rodando, mas você está tentando acessá-lo direto
- Configure como proxy no navegador, não acesse a URL diretamente

### Fluxos não aparecem
- Verifique se o proxy está configurado no navegador
- Teste com uma requisição simples: `curl -x localhost:8080 http://httpbin.org/get`
- Verifique os logs: `docker compose logs -f mitm`

### Erro ao gerar OpenAPI/Postman
- Verifique se existem flows capturados
- Certifique-se de que o volume `/data` está montado corretamente
- Veja os logs: `docker compose logs -f backend`

## 📚 Próximos Passos

1. Capture seus flows
2. Gere o OpenAPI
3. Use em: Swagger UI, ReDoc, ou qualquer ferramenta que suporte OpenAPI
4. Ou gere o Postman para testes automatizados

## 🎓 Exemplos Práticos

### Executar um Request do Postman
1. Importe a coleção no Postman
2. Selecione um request
3. Clique em Send
4. Analise a resposta

### Documentar com Swagger UI
1. Gere o OpenAPI
2. Vá para https://editor.swagger.io
3. File → Import File
4. Selecione seu arquivo OpenAPI
5. Pronto! Sua API documentada e interativa

## 📞 Suporte

Problemas? Verifique:
- Docker está rodando: `docker ps`
- Serviços estão saudáveis: `docker compose ps`
- Logs de erro: `docker compose logs`
