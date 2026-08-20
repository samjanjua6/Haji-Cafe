# Haji Café — Multi-Tenant Franchise Management & AI Voice Assistant Platform

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-Client_Py-2D3748.svg)](https://prisma-client-py.readthedocs.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![LiveKit](https://img.shields.io/badge/LiveKit-Voice_Agents-FF6B6B.svg)](https://livekit.io/)

A full-stack, enterprise-ready multi-tenant café franchise management system. Haji Café enables franchise owners and branch managers to manage multi-location café hierarchies, catalog & branch-specific pricing, real-time inventory tracking, kitchen order lifecycles, staff roles, and audit trails — powered by **Multi-Agent Text AI** and a full-duplex **LiveKit Voice Assistant**.

---

## 🌟 Key Features

### 🏢 Multi-Tenant Franchise & Branch Management
- **Hierarchical Tenancy:** Support for multi-branch café franchises (`Cafe` ➔ `Branches`).
- **Scoped RBAC:** 4 distinct user tiers (`SUPER_ADMIN`, `CAFE_OWNER`, `BRANCH_MANAGER`, `STAFF`) with granular scope bindings (`UserScope`).
- **Safe Lifecycle Management:** Soft-delete (archiving) & restoration of cafés with pre-archive impact assessments (impact on active branches, menu items, orders, and staff).

### 📋 Menu & Real-Time Stock Management
- **Centralized Master Catalog:** Master menu items and categories managed at the café level.
- **Branch-Specific Overrides:** Branch managers can override prices, toggle availability, and set custom low-stock thresholds.
- **Inventory & Stock Logs:** Real-time stock change tracking (`StockHistoryLog`) with audit reasons (`RESTOCK`, `SALE`, `DAMAGE`, `ADJUSTMENT`).
- **Stock Rollup & Alerts:** Café-wide inventory rollups and dashboard alerts for low-stock and sold-out items.

### ☕ Order Processing & Kitchen POS
- **State-Machine Lifecycle:** Strict status transitions (`PENDING` ➔ `IN_PREPARATION` ➔ `COMPLETED` / `CANCELLED`).
- **Price Immutability:** Historical order items lock `price_at_purchase` ensuring receipts and revenue analytics remain accurate regardless of future price changes.
- **Aggregated Analytics:** Branch-level POS views and aggregated franchise-wide order histories.

### 📅 Calendar & Staff Coordination
- **Google OAuth & Calendar Integration:** Connect Google accounts to schedule meetings with staff directly into Google Calendar from the dashboard.
- **Audit Logging:** System-wide audit trails recording sensitive actions across tenants and branches.

### 🤖 Multi-Agent AI & Real-Time Voice Assistant
- **Specialized Text AI Agents:** Supervisor agent delegating queries to specialized agents (**Café Agent**, **Inventory Agent**, **Order Agent**) with direct database tools.
- **WebSocket Streaming:** Token-by-token real-time chat streaming over WebSocket (`/chatbot/ws`) and REST endpoints.
- **LiveKit Voice Agent:** Low-latency, full-duplex voice pipeline combining:
  - **Silero VAD** (Voice Activity Detection)
  - **Deepgram Nova-2** (Speech-to-Text)
  - **Groq LLM** (Ultra-fast inference)
  - **ElevenLabs** (High-quality Text-to-Speech)

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance asynchronous Python API |
| **ORM / Database Layer** | [Prisma Client Python](https://prisma-client-py.readthedocs.io/) | Type-safe ORM for relational queries |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Relational database with foreign key constraints & indexes |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router) | React 19 server and client components |
| **Styling & Icons** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) | Modern responsive design & UI components |
| **State & Data Fetching** | [TanStack React Query](https://tanstack.com/query) + [Zustand](https://zustand-demo.pmnd.rs/) | Global state and server-state caching |
| **Auth & Security** | JWT (Access + Refresh Token rotation) + Bcrypt | Multi-session token rotation and role guards |
| **OAuth** | Google OAuth 2.0 | Google Login and Google Calendar API scopes |
| **Real-Time Voice** | [LiveKit Agents SDK](https://livekit.io/) | Full-duplex WebRTC voice agent worker |
| **AI / LLM & Speech** | Groq (`gpt-oss-120b` / `llama3-70b`), Deepgram, ElevenLabs | Conversational reasoning, STT, and TTS |
| **Deployment & Proxy** | Caddy + PM2 | Automatic HTTPS reverse proxy & process supervisor |

---

## 📁 Project Structure

```
cafe-project/
├── app/
│   ├── main.py                      # FastAPI application entry point & CORS
│   ├── config.py                    # Environment settings & Pydantic BaseSettings
│   ├── database.py                  # Prisma database client singleton & lifecycle
│   ├── core/                        # Core dependencies, security & custom exceptions
│   ├── middleware/
│   │   ├── auth_middleware.py       # JWT validation & user resolver
│   │   └── rbac.py                  # Role and tenant/branch scope guard dependencies
│   ├── modules/
│   │   ├── admin/                   # User role management & scope assignments
│   │   ├── audit/                   # Audit logging & activity history
│   │   ├── auth/                    # Register, login, refresh, logout, Google OAuth & profile
│   │   ├── cafes/                   # Café & branch CRUD, impact check, meetings, stock alerts
│   │   ├── chatbot/                 # AI text assistant & LiveKit voice worker
│   │   │   ├── agent.py             # LiveKit Voice Agent entry point (VAD + STT + LLM + TTS)
│   │   │   ├── agents/              # Supervisor and specialist domain agents
│   │   │   ├── core/                # Reasoning engine & LLM utilities
│   │   │   ├── tools/               # Café, inventory, and order database tools
│   │   │   └── voice.py             # Standalone Deepgram STT & ElevenLabs TTS service
│   │   ├── menu/                    # Master items, categories, branch overrides & stock history
│   │   └── orders/                  # Order creation, status machine & cafe aggregates
│   └── utils/                       # JSON & Prisma serialization utilities
├── frontend/                        # Next.js 16 Client Application
│   ├── app/                         # App router (auth, cafes, branches, dashboard, admin, settings)
│   ├── components/                  # UI components (ChatbotWidget, Topbar, Sidebar, Tables, Modals)
│   ├── hooks/                       # React hooks (auth, data queries)
│   ├── lib/                         # API client & helper utilities
│   ├── store/                       # Zustand global stores
│   └── types/                       # TypeScript interfaces
├── prisma/
│   └── schema.prisma                # Database schema & Prisma models
├── tests/                           # Unit & integration test scripts
│   ├── test_admin_roles.py          # Super admin role boundaries & demotion protections
│   ├── test_assign.py               # User scope assignment tests
│   ├── test_async_tool.py           # Async tool execution tests
│   ├── test_cafe_archiving.py       # Café archiving & RBAC scope filter tests
│   ├── test_livekit_agent.py        # LiveKit, Groq & ElevenLabs pipeline test
│   ├── test_models.py               # LLM model connectivity tests
│   └── test_stream.py               # Tool stream response verification
├── schema.sql                       # PostgreSQL DDL definitions
├── seed.sql                         # Raw SQL sample data
├── seed.py                          # Python async seed script
├── requirements.txt                 # Backend Python dependencies
├── deploy.sh                        # VPS deployment setup script
├── update.sh                        # CI/CD update and PM2 restart script
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 20.x or higher (npm / pnpm / yarn)
- **PostgreSQL:** 15 or higher running locally or remotely

---

### 2. Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/samjanjua6/Haji-Cafe.git
   cd Haji-Cafe
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Linux/macOS:
   source venv/bin/activate
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Configure your database URL, JWT secrets, OAuth, and AI keys (see [Environment Variables](#-environment-variables)).

5. **Generate Prisma client & push database schema:**
   ```bash
   prisma generate
   prisma db push
   ```

6. **Seed the database (Optional):**
   ```bash
   python seed.py
   ```

7. **Start the FastAPI backend server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API Base URL: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

---

### 3. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Create local environment file (`frontend/.env.local`):**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
   ```

4. **Run the Next.js development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### 4. Running the LiveKit Voice Agent (Optional)

To enable real-time voice interactions:

1. Ensure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, and `GROQ_API_KEY` are populated in your `.env`.
2. Run the voice worker in console mode:
   ```bash
   python app/modules/chatbot/agent.py start
   ```

---

## 🔐 Role-Based Access Control (RBAC)

The system enforces strict multi-tenant authorization through hierarchical roles and user scope bindings:

```
                  ┌─────────────────┐
                  │   SUPER_ADMIN   │ (Global Platform Access)
                  └────────┬────────┘
                           │
                  ┌────────┴────────┐
                  │   CAFE_OWNER    │ (Scoped to specific Cafés)
                  └────────┬────────┘
                           │
                  ┌────────┴────────┐
                  │ BRANCH_MANAGER  │ (Scoped to specific Branches)
                  └────────┬────────┘
                           │
                  ┌────────┴────────┐
                  │      STAFF      │ (Scoped to specific Branches - POS & Kitchen)
                  └─────────────────┘
```

| Role | Scope Level | Permissions |
|---|---|---|
| `SUPER_ADMIN` | Global | Manage all cafés, assign/demote roles, manage user scopes, view all franchise analytics. Protected against self-demotion and demoting the last admin. |
| `CAFE_OWNER` | Café-level | Create & manage branches, master menu catalog, categories, view audit logs, schedule staff meetings via Google Calendar, view stock rollups & low stock alerts. |
| `BRANCH_MANAGER` | Branch-level | Override menu prices, manage branch stock & thresholds, view stock history, view branch order history, update order status. |
| `STAFF` | Branch-level | Place orders, view branch active menu, transition order status (`PENDING` ➔ `IN_PREPARATION` ➔ `COMPLETED`). |

---

## 📡 API Reference Overview

### 🔐 Auth (`/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user account with email & password |
| `POST` | `/auth/login` | Public | Authenticate and obtain access + refresh tokens |
| `POST` | `/auth/refresh` | Public | Rotate refresh token for a new token pair |
| `POST` | `/auth/logout` | Authenticated | Revoke active refresh token |
| `POST` | `/auth/logout-all` | Authenticated | Revoke all active sessions for the user |
| `GET` | `/auth/google` | Public | Initiate Google OAuth 2.0 flow |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback handler |
| `GET` | `/auth/me` | Authenticated | Get current user profile, role, and assigned scopes |
| `PUT` | `/auth/me` | Authenticated | Update user profile preferences & default café/branch |
| `PUT` | `/auth/change-password` | Authenticated | Change current user password |
| `GET` | `/auth/sessions` | Authenticated | List all active login sessions |
| `GET` | `/auth/google/connect` | Authenticated | Get Google OAuth URL to link Google Calendar |
| `POST` | `/auth/google/disconnect` | Authenticated | Unlink Google account & Calendar integration |

### 👑 Admin (`/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/users` | `SUPER_ADMIN` | List all users with roles and assigned scopes |
| `PUT` | `/admin/users/{id}/role` | `SUPER_ADMIN` | Update a user's role (with guard protections) |
| `POST` | `/admin/users/{id}/scopes` | `SUPER_ADMIN` | Assign user to a specific café or branch |
| `DELETE` | `/admin/users/{id}/scopes/{scope_id}` | `SUPER_ADMIN` | Remove a user scope assignment |

### 🏬 Cafés & Branches (`/cafes`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/cafes` | `SUPER_ADMIN` | Create a new café franchise |
| `GET` | `/cafes` | `SUPER_ADMIN`, `CAFE_OWNER` | List accessible cafés (supports `?include_archived=true`) |
| `GET` | `/cafes/{id}` | `SUPER_ADMIN`, `CAFE_OWNER` | Get café details |
| `PUT` | `/cafes/{id}` | `SUPER_ADMIN`, `CAFE_OWNER` | Update café details |
| `GET` | `/cafes/{id}/impact` | `SUPER_ADMIN` | Get pre-deletion impact analysis counts |
| `DELETE` | `/cafes/{id}` | `SUPER_ADMIN` | Soft-delete (archive) café franchise |
| `POST` | `/cafes/{id}/restore` | `SUPER_ADMIN` | Restore an archived café |
| `POST` | `/cafes/{id}/branches` | `SUPER_ADMIN`, `CAFE_OWNER` | Create branch under café |
| `GET` | `/cafes/{id}/branches` | `SUPER_ADMIN`, `CAFE_OWNER` | List all branches for café |
| `PUT` | `/cafes/{id}/branches/{bid}` | `SUPER_ADMIN`, `CAFE_OWNER`, `BRANCH_MANAGER` | Update branch information |
| `DELETE` | `/cafes/{id}/branches/{bid}` | `SUPER_ADMIN`, `CAFE_OWNER` | Delete a branch |
| `GET` | `/cafes/{id}/staff` | `SUPER_ADMIN`, `CAFE_OWNER` | List staff members assigned to café |
| `POST` | `/cafes/{id}/meetings` | `CAFE_OWNER` | Schedule staff meeting via Google Calendar |
| `GET` | `/cafes/{id}/low-stock-alerts` | `SUPER_ADMIN`, `CAFE_OWNER` | Get low stock & sold-out alerts across branches |

### 📜 Menu & Inventory
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/cafes/{id}/menu` | `SUPER_ADMIN`, `CAFE_OWNER` | Create master menu item |
| `GET` | `/cafes/{id}/menu` | `SUPER_ADMIN`, `CAFE_OWNER` | List all active master menu items |
| `PUT` | `/cafes/{id}/menu/{mid}` | `SUPER_ADMIN`, `CAFE_OWNER` | Update master menu item |
| `DELETE` | `/cafes/{id}/menu/{mid}` | `SUPER_ADMIN`, `CAFE_OWNER` | Soft-delete master menu item |
| `POST` | `/branches/{id}/menu` | `SUPER_ADMIN`, `BRANCH_MANAGER` | Set branch menu item price override & stock |
| `GET` | `/branches/{id}/menu` | `SUPER_ADMIN`, `BRANCH_MANAGER`, `STAFF` | Get active branch menu with effective prices |
| `PATCH` | `/branches/{id}/menu/{mid}` | `SUPER_ADMIN`, `BRANCH_MANAGER` | Toggle in-stock status or patch price override |
| `GET` | `/cafes/{id}/stock-rollup` | `SUPER_ADMIN`, `CAFE_OWNER` | Aggregate inventory rollup across all branches |
| `PUT` | `/branches/{id}/menu/{mid}/stock` | `SUPER_ADMIN`, `BRANCH_MANAGER` | Adjust item quantity with reason & log audit |
| `PUT` | `/branches/{id}/menu/{mid}/threshold` | `SUPER_ADMIN`, `CAFE_OWNER` | Update low stock threshold for a branch item |
| `GET` | `/branches/{id}/menu/{mid}/stock-history` | Branch Scoped | View audit history log of stock changes |

### 🛒 Orders
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/branches/{id}/orders` | `SUPER_ADMIN`, `BRANCH_MANAGER`, `STAFF` | Place order (snapshots purchase prices) |
| `GET` | `/branches/{id}/orders` | `SUPER_ADMIN`, `BRANCH_MANAGER` | List branch orders with pagination & filters |
| `GET` | `/branches/{id}/orders/{oid}` | `SUPER_ADMIN`, `BRANCH_MANAGER`, `STAFF` | Get order detail with item breakdown |
| `PATCH` | `/branches/{id}/orders/{oid}/status` | `SUPER_ADMIN`, `BRANCH_MANAGER`, `STAFF` | Transition order state (`PENDING` ➔ `IN_PREPARATION` ➔ `COMPLETED` / `CANCELLED`) |
| `GET` | `/cafes/{id}/orders` | `SUPER_ADMIN`, `CAFE_OWNER` | Franchise-wide aggregated order history |

### 📋 Audit (`/cafes`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/cafes/{id}/audit-logs` | `SUPER_ADMIN`, `CAFE_OWNER` | Fetch recent audit activity logs for a café |

### 🤖 Chatbot & Voice (`/chatbot`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/chatbot/chat` | Authenticated | Send message to Multi-Agent AI (REST response) |
| `WS` | `/chatbot/ws?token={jwt}` | Authenticated | Real-time token streaming WebSocket |
| `GET` | `/chatbot/livekit-token` | Authenticated | Generate user token for LiveKit voice room |
| `POST` | `/chatbot/stt` | Authenticated | Convert uploaded audio to text via Deepgram |
| `POST` | `/chatbot/tts` | Authenticated | Convert text to speech mp3 audio via ElevenLabs |
| `GET` | `/chatbot/tts/test` | Authenticated | Test ElevenLabs configuration and connectivity |

---

## ⚙️ Environment Variables

### Backend (`.env`)
```env
# Application
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cafe_db

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth 2.0 & Calendar
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# AI & LLM Inference
GROQ_API_KEY=gsk_your_groq_api_key

# LiveKit Voice Agent Pipeline
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
DEEPGRAM_API_KEY=your-deepgram-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=WTnybLRChAQj0OBHYZg4
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## 🧪 Testing

Test scripts are organized in the [`tests/`](file:///d:/zylo/cafe-project/tests) directory:

```bash
# Run all tests using pytest
pytest

# Or execute specific integration test scripts:
python tests/test_admin_roles.py      # Tests admin boundaries & demotion protections
python tests/test_cafe_archiving.py    # Tests café soft-delete & scope filtering
python tests/test_assign.py            # Tests user scope assignments
python tests/test_livekit_agent.py     # Tests Groq & ElevenLabs integrations
```

---

## 👥 Default Demo Credentials (from `seed.py`)

| Role | Email | Password | Scope |
|---|---|---|---|
| **Super Admin** | `admin@hajicafe.com` | `password123` | Global Platform Access |
| **Cafe Owner** | `samjanjua6@gmail.com` | `password123` | Sunrise Coffee Franchise |
| **Branch Manager** | `manager@sunrise-downtown.com` | `password123` | Downtown Branch |
| **Staff** | `staff@sunrise-downtown.com` | `password123` | Downtown Branch |

---

## 🚢 Production Deployment

The project includes preconfigured scripts for Ubuntu VPS deployment using **Caddy** and **PM2**:

1. **Initial VPS Setup:**
   ```bash
   chmod +x deploy.sh update.sh
   ./deploy.sh
   ```
2. **Update & Restart Services:**
   ```bash
   ./update.sh
   ```

PM2 automatically oversees three services:
- `backend` (FastAPI via Uvicorn on port 8000)
- `frontend` (Next.js production server on port 3000)
- `livekit-agent` (LiveKit Real-Time Voice Worker)

Caddy automatically handles HTTPS certificates and reverse proxies:
- `https://haji-cafe.mychatbot.codes` ➔ `localhost:3000`
- `https://api.haji-cafe.mychatbot.codes` ➔ `localhost:8000`

---

## 📄 License

This project is proprietary and intended for the Haji Café franchise platform.
