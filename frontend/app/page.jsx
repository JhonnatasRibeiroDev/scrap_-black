'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getMethodColor(method) {
  const colors = {
    GET: "#0070f3",
    POST: "#28a745",
    PUT: "#ffc107",
    DELETE: "#dc3545",
    PATCH: "#6f42c1",
    HEAD: "#6c757d",
    OPTIONS: "#17a2b8",
  };
  return colors[method] || "#6c757d";
}

function getStatusColor(status) {
  if (status == null) return "#999";
  if (status >= 200 && status < 300) return "#28a745";
  if (status >= 300 && status < 400) return "#17a2b8";
  if (status >= 400 && status < 500) return "#ffc107";
  return "#dc3545";
}

export default function Home() {
  const [flows, setFlows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [message, setMessage] = useState(null);
  const [apiBase, setApiBase] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const abortRef = useRef(null);
  const selectedRef = useRef(selected);

  // Manter ref atualizada para não perder seleção
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    setApiBase(`${protocol}//${hostname}:8000`);
  }, []);

  const loadFlows = useCallback(async () => {
    if (!apiBase) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetching(true);
    try {
      const res = await fetch(`${apiBase}/flows`, { signal: controller.signal });
      const data = await res.json();
      const list = Array.isArray(data?.flows) ? data.flows : [];
      setFlows(list);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error("Erro ao carregar flows:", err);
      }
    } finally {
      setIsFetching(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!apiBase) return;

    loadFlows();
    
    if (!autoRefresh) return;
    
    const interval = setInterval(loadFlows, 5000);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [apiBase, autoRefresh, loadFlows]);

  const toggleOne = useCallback((id) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const selectAllVisible = useCallback((visibleFlows) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      const allSelected = visibleFlows.every(f => prev.has(f.id));
      
      if (allSelected) {
        visibleFlows.forEach(f => newSet.delete(f.id));
      } else {
        visibleFlows.forEach(f => newSet.add(f.id));
      }
      return newSet;
    });
  }, []);

  const downloadFile = useCallback((filename) => {
    const link = document.createElement("a");
    link.href = `${apiBase}/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [apiBase]);

  const generateFile = useCallback(async (endpoint) => {
    if (!apiBase || selected.size === 0) return;

    setLoadingGenerate(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiBase}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_flows: Array.from(selected) }),
      });

      const data = await res.json();

      if (data?.success) {
        setMessage({ type: 'ok', text: data.message || "Gerado com sucesso!" });
        if (data.file) {
          setTimeout(() => downloadFile(data.file), 500);
        }
      } else {
        setMessage({ type: 'err', text: data?.message || "Falha ao gerar arquivo" });
      }
    } catch (err) {
      setMessage({ type: 'err', text: err?.message || String(err) });
    } finally {
      setLoadingGenerate(false);
    }
  }, [apiBase, selected, downloadFile]);

  const methods = useMemo(() => {
    const set = new Set(flows.map(f => f.method).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [flows]);

  const filteredFlows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return flows.filter(f => {
      const methodOk = methodFilter === "ALL" || f.method === methodFilter;

      let statusOk = statusFilter === "ALL";
      if (!statusOk) {
        const status = f.status;
        if (statusFilter === "2xx") statusOk = status >= 200 && status < 300;
        else if (statusFilter === "3xx") statusOk = status >= 300 && status < 400;
        else if (statusFilter === "4xx") statusOk = status >= 400 && status < 500;
        else if (statusFilter === "5xx") statusOk = status >= 500;
        else if (statusFilter === "none") statusOk = status == null;
      }

      const url = (f.url || "").toLowerCase();
      const queryOk = !query || url.includes(query);

      return methodOk && statusOk && queryOk;
    });
  }, [flows, searchQuery, methodFilter, statusFilter]);

  const allVisibleSelected = useMemo(() => {
    return filteredFlows.length > 0 && filteredFlows.every(f => selected.has(f.id));
  }, [filteredFlows, selected]);

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px", maxWidth: 1200, margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: "#1e293b" }}>🔗 Borde Stack</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            Capture flows via mitmproxy e gere OpenAPI/Postman.
          </p>
        </div>

        {/* Stats & Actions Panel */}
        <div style={{
          padding: 16,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
          minWidth: 300,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            <span>Total: <strong style={{ color: "#1e293b" }}>{flows.length}</strong></span>
            <span>Filtrados: <strong style={{ color: "#1e293b" }}>{filteredFlows.length}</strong></span>
            <span>Selecionados: <strong style={{ color: "#0ea5e9" }}>{selected.size}</strong></span>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => generateFile("generate-openapi")}
              disabled={selected.size === 0 || loadingGenerate}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 8,
                border: "none",
                background: selected.size === 0 || loadingGenerate ? "#e2e8f0" : "#16a34a",
                color: selected.size === 0 || loadingGenerate ? "#94a3b8" : "#fff",
                cursor: selected.size === 0 || loadingGenerate ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                transition: "all 0.2s"
              }}
            >
              {loadingGenerate ? "⏳ Gerando..." : "📄 OpenAPI"}
            </button>

            <button
              onClick={() => generateFile("generate-postman")}
              disabled={selected.size === 0 || loadingGenerate}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 8,
                border: "none",
                background: selected.size === 0 || loadingGenerate ? "#e2e8f0" : "#f59e0b",
                color: selected.size === 0 || loadingGenerate ? "#94a3b8" : "#fff",
                cursor: selected.size === 0 || loadingGenerate ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                transition: "all 0.2s"
              }}
            >
              {loadingGenerate ? "⏳ Gerando..." : "📦 Postman"}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={clearSelection}
              disabled={selected.size === 0}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                background: selected.size === 0 ? "#f1f5f9" : "#fff",
                color: selected.size === 0 ? "#94a3b8" : "#1e293b",
                cursor: selected.size === 0 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 13
              }}
            >
              🗑️ Limpar seleção
            </button>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Auto-refresh
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: isFetching ? "#22c55e" : (autoRefresh ? "#94a3b8" : "#ef4444"),
                display: "inline-block",
                marginLeft: 4
              }} />
            </label>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 10,
            border: `1px solid ${message.type === 'ok' ? "#86efac" : "#fecaca"}`,
            background: message.type === 'ok' ? "#f0fdf4" : "#fef2f2",
            color: message.type === 'ok' ? "#166534" : "#991b1b",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>{message.type === 'ok' ? "✅ " : "❌ "}{message.text}</span>
          <button 
            onClick={() => setMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "inherit" }}
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <section style={{ marginBottom: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Filtrar por URL..."
            style={{
              flex: 1,
              minWidth: 240,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              outline: "none",
              fontSize: 14
            }}
          />

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
          >
            {methods.map(m => (
              <option key={m} value={m}>{m === "ALL" ? "Todos métodos" : m}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
          >
            <option value="ALL">Todos status</option>
            <option value="2xx">2xx (Sucesso)</option>
            <option value="3xx">3xx (Redirecionamento)</option>
            <option value="4xx">4xx (Erro cliente)</option>
            <option value="5xx">5xx (Erro servidor)</option>
            <option value="none">Sem status</option>
          </select>

          <button
            onClick={() => selectAllVisible(filteredFlows)}
            disabled={filteredFlows.length === 0}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: filteredFlows.length === 0 ? "#f1f5f9" : (allVisibleSelected ? "#fee2e2" : "#dbeafe"),
              color: filteredFlows.length === 0 ? "#94a3b8" : (allVisibleSelected ? "#991b1b" : "#1e40af"),
              cursor: filteredFlows.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 14
            }}
          >
            {allVisibleSelected ? "☐ Desmarcar visíveis" : "☑ Selecionar visíveis"}
          </button>

          <button
            onClick={loadFlows}
            disabled={isFetching}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: isFetching ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 14
            }}
          >
            🔄 Atualizar
          </button>
        </div>
      </section>

      {/* Table */}
      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ maxHeight: 500, overflow: "auto" }}>
          {filteredFlows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
              <p style={{ margin: 0, fontWeight: 600 }}>Nenhum flow encontrado</p>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#94a3b8" }}>
                Configure o proxy em <strong>localhost:8080</strong> e navegue no sistema.
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                <tr>
                  <th style={{ padding: 14, textAlign: "left", width: 50, borderBottom: "2px solid #e2e8f0" }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => selectAllVisible(filteredFlows)}
                      style={{ cursor: "pointer", width: 18, height: 18 }}
                    />
                  </th>
                  <th style={{ padding: 14, textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: 700, color: "#475569" }}>Método</th>
                  <th style={{ padding: 14, textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: 700, color: "#475569" }}>URL</th>
                  <th style={{ padding: 14, textAlign: "center", width: 100, borderBottom: "2px solid #e2e8f0", fontWeight: 700, color: "#475569" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredFlows.map((flow) => {
                  const isSelected = selected.has(flow.id);

                  return (
                    <tr
                      key={flow.id}
                      onClick={() => toggleOne(flow.id)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "#eff6ff" : "#fff",
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s"
                      }}
                    >
                      <td style={{ padding: 14 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(flow.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: "pointer", width: 18, height: 18 }}
                        />
                      </td>

                      <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: "6px 12px",
                            backgroundColor: getMethodColor(flow.method),
                            color: "white",
                            borderRadius: 6,
                            fontSize: 12,
                            letterSpacing: 0.5
                          }}
                        >
                          {flow.method}
                        </span>
                      </td>

                      <td style={{ padding: 14, fontSize: 13, wordBreak: "break-all", color: "#1e293b", fontFamily: "monospace" }}>
                        {flow.url}
                      </td>

                      <td style={{ padding: 14, textAlign: "center" }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            backgroundColor: getStatusColor(flow.status),
                            color: "white",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            display: "inline-block",
                            minWidth: 50
                          }}
                        >
                          {flow.status ?? "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Instructions */}
      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <h3 style={{ margin: "0 0 12px", color: "#1e293b" }}>📚 Como usar</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: "#475569", lineHeight: 1.8 }}>
          <li>Configure o navegador/aplicação para usar o proxy em <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>http://localhost:8080</code></li>
          <li>Navegue nas telas que deseja documentar</li>
          <li>Selecione os flows clicando nas linhas da tabela</li>
          <li>Clique em <strong>OpenAPI</strong> ou <strong>Postman</strong> para gerar e baixar</li>
          <li>Importe no Postman: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>File → Import</code></li>
        </ol>
      </section>
    </main>
  );
}
