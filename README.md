<<<<<<< HEAD
# Haji Cafe Management API
=======
# Haji Café Management API
>>>>>>> 17c338789a22be634704be55786fcb57de85099a

A multi-tenant backend system for a café franchise management platform.

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) |
| ORM | Prisma (`prisma-client-py`) |
| Database | PostgreSQL |
| Auth | JWT (Access + Refresh Token rotation) |
| OAuth | Google OAuth 2.0 |
| Validation | Pydantic v2 |

## Project Structure

```
cafe-project/
├── app/
│   ├── main.py               # FastAPI entry point
│   ├── config.py             # Settings from .env
│   ├── database.py           # Prisma client singleton
│   ├── middleware/
│   │   ├── auth_middleware.py  # JWT decoding dependency
│   │   └── rbac.py             # Role/scope guard dependencies
│   └── modules/
│       ├── auth/             # Register, Login, Google OAuth, JWT
│       ├── cafes/            # Café & Branch CRUD
│       ├── menu/             # Master Menu & Branch Overrides
│       └── orders/           # Order placement & lifecycle
├── prisma/
│   └── schema.prisma         # Prisma schema
├── schema.sql                # Raw PostgreSQL DDL
├── seed.sql                  # Sample data
├── requirements.txt
└── .env.example
```

## Setup & Running

### 1. Prerequisites
- Python 3.11+
- PostgreSQL running locally

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET_KEY, GOOGLE_CLIENT_ID, etc.
```

### 4. Create database & run schema
```bash
# In psql or pgAdmin, create a database named cafe_db
psql -U postgres -d cafe_db -f schema.sql
psql -U postgres -d cafe_db -f seed.sql  # Optional sample data
```

### 5. Generate Prisma client
```bash
prisma generate
```

### 6. Run the server
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.
Auto-generated Swagger docs: `http://localhost:8000/docs`

## API Overview

### Auth (`/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Sign up (email + password) |
| POST | `/auth/login` | Login, get access + refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/google` | Google OAuth redirect |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/me` | Current user profile |

### Cafes & Branches (`/cafes`)
| Method | Endpoint | Role |
|---|---|---|
| POST | `/cafes` | SUPER_ADMIN |
| GET | `/cafes` | SUPER_ADMIN |
| GET | `/cafes/{id}` | SUPER_ADMIN, CAFE_OWNER |
| PUT | `/cafes/{id}` | SUPER_ADMIN, CAFE_OWNER |
| DELETE | `/cafes/{id}` | SUPER_ADMIN |
| POST | `/cafes/{id}/branches` | CAFE_OWNER |
| GET | `/cafes/{id}/branches` | CAFE_OWNER |
| PUT | `/cafes/{id}/branches/{bid}` | CAFE_OWNER, BRANCH_MANAGER |
| DELETE | `/cafes/{id}/branches/{bid}` | CAFE_OWNER |

### Menu
| Method | Endpoint | Role |
|---|---|---|
| POST | `/cafes/{id}/menu` | CAFE_OWNER |
| GET | `/cafes/{id}/menu` | CAFE_OWNER |
| PUT | `/cafes/{id}/menu/{mid}` | CAFE_OWNER |
| DELETE | `/cafes/{id}/menu/{mid}` | CAFE_OWNER |
| POST | `/branches/{id}/menu` | BRANCH_MANAGER |
| GET | `/branches/{id}/menu` | BRANCH_MANAGER, STAFF |
| PATCH | `/branches/{id}/menu/{mid}` | BRANCH_MANAGER |

### Orders
| Method | Endpoint | Role |
|---|---|---|
| POST | `/branches/{id}/orders` | STAFF, BRANCH_MANAGER |
| GET | `/branches/{id}/orders` | BRANCH_MANAGER |
| GET | `/branches/{id}/orders/{oid}` | BRANCH_MANAGER, STAFF |
| PATCH | `/branches/{id}/orders/{oid}/status` | STAFF, BRANCH_MANAGER |
| GET | `/cafes/{id}/orders` | CAFE_OWNER |
