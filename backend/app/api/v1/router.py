from fastapi import APIRouter
from .endpoints import resumes, applications, ai, export, settings, analytics

api_router = APIRouter()
api_router.include_router(resumes.router)
api_router.include_router(applications.router)
api_router.include_router(ai.router)
api_router.include_router(export.router)
api_router.include_router(settings.router)
api_router.include_router(analytics.router)
