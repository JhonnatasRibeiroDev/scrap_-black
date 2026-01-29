from fastapi import FastAPI

app = FastAPI(title="Borde API", version="0.1.0")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/greet")
def greet(name: str = "mundo") -> dict:
    return {"message": f"Olá, {name}!"}
