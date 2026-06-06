from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from .core.config import settings
from .api.v1.router import api_router
import re

ALLOWED_ORIGIN_PATTERNS = [
    r"https://.*\.vercel\.app$",
    r"http://localhost:\d+$",
    r"https://ai-career-copilot-teal-mu\.vercel\.app$",
]

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    for pattern in ALLOWED_ORIGIN_PATTERNS:
        if re.match(pattern, origin):
            return True
    return False

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        if request.method == "OPTIONS":
            response = Response(status_code=204)
        else:
            response = await call_next(request)
        if is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(DynamicCORSMiddleware)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.APP_NAME}
