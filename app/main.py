from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_db, disconnect_db
from app.modules.auth.router import router as auth_router
from app.modules.cafes.router import router as cafes_router
from app.modules.menu.router import router as menu_router
from app.modules.orders.router import router as orders_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Prisma DB connection lifecycle."""
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="Brewly Café Management API",
    description="Multi-tenant backend for a café franchise management platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.APP_ENV == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(cafes_router, prefix="/cafes", tags=["Cafes & Branches"])
app.include_router(menu_router, tags=["Menu"])
app.include_router(orders_router, tags=["Orders"])


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": "Brewly Café Management API", "version": "1.0.0"}
