# Enterprise ERP & Multi-Branch Inventory Management System

A full-featured enterprise inventory tracking and multi-branch resource planning solution built with **React, TypeScript, Tailwind CSS** on the frontend and a **Python Django REST Framework with PostgreSQL** backend.

---

## 🌟 Key Features

- **Multi-Branch & Multi-Warehouse Operations**: Manage central headquarters alongside satellite branches with independent stock tracking and inter-branch shipments.
- **Role-Based Access Control (RBAC)**: Support for Super Admin, Inventory Manager, Branch Manager, Front Desk, and Accountant roles.
- **Stock Movement Ledger & Audit Logs**: Detailed audit trail for every stock receipt, dispatch, issue, transfer, and adjustment.
- **Consumable & Fixed Asset Management**:
  - Consumable Stock Out & Issue logging with work order and technician tagging.
  - Fixed Asset Register with Depreciation schedules (Straight Line, Declining Balance, Written Down Value).
- **Serial, MAC & PON Tracking**: Track individual high-value items with warranty periods, serial numbers, and MAC addresses.
- **Purchase Orders & Shipments**: Draft, approve, and track purchase orders with suppliers and inter-branch shipment workflows.
- **Nepali Fiscal Calendar Support**: Native support for BS calendar conversion (AD/BS) and Nepali fiscal year reporting.
- **Realtime Action & Notification Center**: Centralized flyout modal in the top header tracking low-stock alerts, pending approvals, in-transit shipments, and purchase orders.
- **Barcode & QR Code Scanner**: Integrated camera scanning for quick stock lookup and dispatching.

---

## 📂 Project Architecture & Directory Structure

```
.
├── src/                          # React + TypeScript Frontend
│   ├── components/               # UI Views and Modals
│   │   ├── Header.tsx            # Sticky Header with Global Search & Notification Toggle
│   │   ├── NotificationCenter.tsx# Actionable Notification Panel
│   │   ├── StockOperations.tsx   # Stock Out, Consumable Issue, Pullouts & Adjustments
│   │   ├── ProductManagement.tsx # Item Catalog & Category Management
│   │   ├── FixedAssetRegister.tsx# Fixed Assets & Depreciation Register
│   │   └── ...
│   ├── types/                    # Shared TypeScript Interfaces
│   ├── utils/                    # BS/AD Calendar Utilities & Permissions
│   └── App.tsx                   # Main React Application shell
│
├── backend_django/               # Django REST Framework Backend
│   ├── config/                   # Django Settings, URLs & WSGI
│   │   ├── settings.py           # PostgreSQL DB & REST Framework Configuration
│   │   └── urls.py               # API & Swagger OpenAPI Documentation Router
│   ├── inventory/                # Primary Inventory Application
│   │   ├── models.py             # ORM Data Models (User, Branch, Product, Stock, etc.)
│   │   ├── serializers.py        # DRF Serializers
│   │   ├── views.py              # REST API ViewSets & Stock-Out Endpoints
│   │   └── urls.py               # API Endpoints Router
│   ├── requirements.txt          # Python Dependencies
│   ├── Dockerfile                # Docker Build Specification
│   └── docker-compose.yml        # Multi-Container Compose Setup (Django + PostgreSQL)
│
└── package.json                  # Frontend Vite / React Configuration
```

---

## 🚀 Getting Started

### 1. Frontend Setup (React + Vite)

The frontend runs using Vite on Node.js:

```bash
# Install Node dependencies
npm install

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

### 2. Backend Setup (Django + PostgreSQL)

#### Option A: Docker Compose (Recommended)

Run both PostgreSQL and the Django REST API with a single command:

```bash
cd backend_django
docker-compose up --build
```

- **Django REST API**: `http://localhost:8000/api/v1/`
- **Interactive OpenAPI / Swagger Documentation**: `http://localhost:8000/api/docs/`
- **Database**: PostgreSQL on port `5432`

#### Option B: Manual Virtual Environment

```bash
cd backend_django

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Configure environment variables (or update config/settings.py)
export POSTGRES_DB=inventory_db
export POSTGRES_USER=inventory_user
export POSTGRES_PASSWORD=securepassword
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432

# Run migrations and start server
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

---

## 🛠️ Django REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/products/` | `GET`, `POST` | List or create products with filtering & search |
| `/api/v1/products/lookup-barcode/?barcode=...` | `GET` | Instant barcode product lookup |
| `/api/v1/stock/` | `GET`, `POST` | View branch-wise inventory quantities |
| `/api/v1/stock/stock-out/` | `POST` | Atomic Stock-Out / Consumable Issue endpoint |
| `/api/v1/movement-ledger/` | `GET` | Audit trail logs for all stock movements |
| `/api/v1/stock-operations/` | `GET`, `POST` | Pullouts, damage logs, and manual adjustments |
| `/api/v1/purchase-orders/` | `GET`, `POST` | Purchase orders & supplier procurement |
| `/api/v1/shipments/` | `GET`, `POST` | Inter-branch shipments tracking |
| `/api/docs/` | `GET` | Interactive Swagger UI API documentation |

---

## 📄 License

This project is licensed under the MIT License.
