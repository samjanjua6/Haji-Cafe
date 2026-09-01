from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_db, disconnect_db
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.cafes.router import router as cafes_router
from app.modules.menu.router import router as menu_router
from app.modules.orders.router import router as orders_router
from app.modules.audit.router import router as audit_router
from app.modules.chatbot.router import router as chatbot_router
from app.modules.analytics.router import router as analytics_router
from app.modules.realtime.router import router as realtime_router
from app.modules.scheduling.router import router as scheduling_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Prisma DB connection lifecycle."""
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="Haji Cafe Management API",
    description="Multi-tenant backend for a café franchise management platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://haji-cafe.mychatbot.codes",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(cafes_router, prefix="/cafes", tags=["Cafes & Branches"])
app.include_router(menu_router, tags=["Menu"])
app.include_router(orders_router, tags=["Orders"])
app.include_router(audit_router, tags=["Audit"])
app.include_router(chatbot_router)
app.include_router(analytics_router)
app.include_router(realtime_router)
app.include_router(scheduling_router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": "Haji Cafe Management API", "version": "1.0.0"}
