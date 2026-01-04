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

@app.on_event("startup")
async def startup_event():
    """Ensure admin user exists on startup"""
    from app.database import SessionLocal
    from app.models.user import User
    from app.auth import get_password_hash
    from datetime import datetime, timezone, timedelta
    
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("⚙️ Admin user not found. Creating default admin...")
            expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                expires_at=expires_at
            )
            db.add(admin)
            try:
                db.commit()
                print("✅ Default admin user created successfully.")
            except Exception:
                db.rollback()
                # Most likely another worker already created it
                pass
        else:
            # print("⚙️ Admin user exists. Ensuring password is correct...")
            admin.hashed_password = get_password_hash("admin123")
            admin.role = "admin" # Ensure role is correct
            db.commit()
            # print("✅ Admin password/role verified and reset.")
    except Exception as e:
        print(f"❌ Error during startup admin setup: {e}")
    finally:
        db.close()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: Allow all origins or specify public IP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent caching for API routes
@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
