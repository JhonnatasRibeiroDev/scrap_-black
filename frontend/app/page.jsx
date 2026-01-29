const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1>Borde Stack</h1>
      <p>
        Frontend rodando separado do backend. Use o endpoint de health para validar:
      </p>
      <code>{`${apiBase}/health`}</code>
      <h2>Fluxo com mitmproxy2swagger</h2>
      <ol>
        <li>Configure seu navegador/app para usar o proxy em <strong>http://localhost:8080</strong>.</li>
        <li>Navegue nas telas que deseja documentar (logado, se necessário).</li>
        <li>Gere o OpenAPI a partir do arquivo de flows.</li>
      </ol>
    </main>
  );
}
