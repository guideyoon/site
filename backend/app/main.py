from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import items, queue, sources, auth, health, users, upload, ai
from app.database import engine, Base
from fastapi.staticfiles import StaticFiles
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ulsan Content Collection Platform",
    description="Platform for collecting and managing Ulsan-related content",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(queue.router, prefix="/api/queue", tags=["queue"])
app.include_router(sources.router, prefix="/api/sources", tags=["sources"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

# Mount static files
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    return {
        "message": "Ulsan Content Collection Platform API",
        "docs": "/docs",
        "health": "/api/health"
    }
