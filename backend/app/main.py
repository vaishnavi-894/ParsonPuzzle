# ── Windows fixes (must run before any other imports) ────────────────────────
import asyncio
import sys
import platform as _platform

# 1. Patch win32_ver/_wmi_query: pymongo 4.x's PowerShell/WMI subprocess call
#    hangs indefinitely on some Windows 11 builds.
_platform.win32_ver = lambda release='', version='', csd='', ptype='': ('11', '10.0.26200', '', '')
if hasattr(_platform, '_wmi_query'):
    _platform._wmi_query = lambda table, *keys: ('' for _ in keys)  # type: ignore

# 2. SelectorEventLoop: Python 3.12+ defaults to ProactorEventLoop on Windows,
#    which prevents uvicorn from accepting TCP connections when paired with motor.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Database
from app.api.routes import auth, puzzles, assignments, attempts, analytics, admin

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handlers
@app.on_event("startup")
async def startup_db_client():
    """Connect to MongoDB on startup"""
    await Database.connect_db()
    await Database.init_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close MongoDB connection on shutdown"""
    await Database.close_db()

# Include routers
app.include_router(auth.router)
app.include_router(puzzles.router)
app.include_router(assignments.router)
app.include_router(attempts.router)
app.include_router(analytics.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Parsons Puzzle API",
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
