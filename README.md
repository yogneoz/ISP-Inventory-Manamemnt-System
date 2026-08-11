# Enterprise ERP & Multi-Branch Inventory Management System

A full-featured enterprise inventory tracking, physical stock audit, and multi-branch resource planning solution built for **React, TypeScript, Tailwind CSS** with **Node.js/Express** and **PostgreSQL / Django REST Framework**.

---

## 🌟 Key Features

- **Multi-Branch & Multi-Warehouse Operations**: Manage central headquarters alongside satellite branches with independent stock tracking, reorder levels, and inter-branch shipments.
- **Physical Stock Count & Reconciliation Audit**:
  - Perform stock counting across branches with variance calculation (shortage/excess).
  - Financial impact calculation, discrepancy reasoning, and automated stock adjustment posting.
  - CSV export for physical audit records.
- **Fiscal Year Closing & Lock Wizard**:
  - 5-Step guided wizard for year-end inventory valuation, fixed asset depreciation posting, trial balance roll-forward, and IRD period locking.
  - Super Admin authorization key check and downloadable official IRD Audit Closing Certificate.
- **Role-Based Access Control (RBAC)**: Support for Super Admin, Inventory Manager, Branch Manager, Front Desk, and Accountant roles with permissions matrix.
- **Stock Movement Ledger & Transaction Logs**: Complete audit trail for stock receipts, dispatches, issues, transfers, damage pullouts, and manual adjustments.
- **Consumable & Fixed Asset Management**:
  - Consumable Stock Out & Issue logging with work order and technician tagging.
  - Fixed Asset Register with Depreciation schedules (Straight Line, Declining Balance, Written Down Value) and automated Income Tax Act rates.
- **Serial, MAC, PON & Customer Device Tracking**:
  - Assign ONUs/routers to customers with PON serial number, MAC address, and warranty tracking.
  - Multi-tier approval workflows for device returns, disconnection refunds, and restock.
- **Purchase Orders, Invoices & Shipments**: Draft, approve, and receive purchase orders with suppliers, manage VAT purchase invoices, and track inter-branch shipments.
- **Nepali Fiscal Calendar Support**: Native support for BS calendar conversion (AD/BS), Bikram Sambat months, and Nepali fiscal year reporting.
- **Financial Statements & Tax Registers**: Income statement, balance sheet, trial balance, VAT purchase register, and depreciation schedules.
- **Automated PostgreSQL Setup**: Built-in automated shell and Node.js setup scripts (`npm run setup:pg`) to automatically download, install, configure PostgreSQL, and migrate 17 relational database tables.

---

## 📂 Project Architecture & Directory Structure

```
.
├── src/                          # React + TypeScript Frontend
│   ├── components/               # UI Views and Modals
│   │   ├── Header.tsx            # Sticky Header with Global Search & Notification Toggle
│   │   ├── Sidebar.tsx           # Multi-level Rail Navigation & Submenus
│   │   ├── PhysicalStockAudit.tsx# Physical Stock Count & Reconciliation Audit View
│   │   ├── FiscalYearClosingWizard.tsx # 5-Step Fiscal Closing & Lock Wizard
│   │   ├── StockOperations.tsx   # Stock Out, Consumable Issue, Pullouts & Adjustments
│   │   ├── CustomerDeviceManagement.tsx # ONU / Router Serial & Customer Assignment
│   │   ├── ApprovalWorkflowCenter.tsx   # Multi-tier Device Return & Refund Approvals
│   │   ├── FixedAssetRegister.tsx# Fixed Assets & Depreciation Register
│   │   ├── NepaliFiscalManagement.tsx # BS Fiscal Calendar & Year Settings
│   │   └── ...
│   ├── types/                    # Shared TypeScript Interfaces
│   ├── utils/                    # BS/AD Calendar Utilities & Permissions
│   └── App.tsx                   # Main React Application shell
│
├── scripts/                      # Database Automation Scripts
│   ├── schema.sql                # Full 17-Table PostgreSQL Schema with Indexes & FKs
│   ├── setup_postgres.sh         # Shell script for auto-downloading & configuring PostgreSQL
│   └── setup_db.js               # Node.js runner for database setup & migration
│
├── server.ts                     # Full-stack Node.js Express server with Vite middleware
│
├── backend_django/               # Django REST Framework Backend (Alternative option)
│   ├── config/                   # Django Settings, URLs & WSGI
│   ├── inventory/                # Primary Inventory Application Models & Views
│   ├── requirements.txt          # Python Dependencies
│   └── docker-compose.yml        # Multi-Container Compose Setup
│
└── package.json                  # Frontend Vite / React & Server Dependencies
```

---

## 🚀 Quick Start & Installation

### 1. Application Startup (Express + React + Vite)

The application runs using Node.js with Vite and Express:

```bash
# Install dependencies
npm install

# (Optional) Run automated PostgreSQL setup
npm run setup:pg

# Start full-stack development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

### 2. Automated PostgreSQL Database Setup

To automatically detect, install, and configure PostgreSQL on port 5432, run:

```bash
# Using Node.js setup runner
npm run setup:pg

# Or using the direct shell script
npm run setup:postgres
```

The script automatically executes `/scripts/schema.sql` to initialize all 17 tables:
- `branches`, `users`, `suppliers`, `categories`, `products`, `inventory_stock`
- `fixed_assets`, `purchase_orders`, `purchase_invoices`, `shipments`, `stock_operations`
- `fiscal_years`, `audit_logs`, `transaction_logs`, `customer_records`, `customer_device_records`, `approval_requests`

---

### 3. Alternative Django REST Backend Setup

If you prefer using the Python Django backend:

```bash
cd backend_django

# Option A: Docker Compose
docker-compose up --build

# Option B: Local Python Environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

---

## 🛠️ Key Environment Variables

Define environment variables in `.env` (refer to `.env.example`):

```env
# Server Port
PORT=3000

# PostgreSQL Database Configuration
DATABASE_URL="postgres://inventory_user:securepassword@localhost:5432/inventory_db"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="inventory_db"
POSTGRES_USER="inventory_user"
POSTGRES_PASSWORD="securepassword"
```

---

## 📄 License

This project is licensed under the MIT License.

