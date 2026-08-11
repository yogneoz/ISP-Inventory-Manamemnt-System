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
│   │   ├── Header.tsx            # Header with Profile Switching & Notifications
│   │   ├── Sidebar.tsx           # Multi-level Rail Navigation & Submenus
│   │   ├── PhysicalStockAudit.tsx# Physical Stock Count & Reconciliation Audit View
│   │   ├── FiscalYearClosingWizard.tsx # 5-Step Fiscal Closing & Lock Wizard
│   │   ├── StockOperations.tsx   # Stock Out, Consumable Issue, Pullouts & Adjustments
      ├── CustomerDeviceManagement.tsx # ONU / Router Serial & Customer Assignment
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
├── ecosystem.config.js           # PM2 Process Manager Configuration for Production
├── Dockerfile                    # Production Docker Multi-Stage Build
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

## 🚀 Local Development Quick Start

### 1. Application Startup (Express + React + Vite)

```bash
# Install dependencies
npm install

# (Optional) Run automated PostgreSQL setup
npm run setup:pg

# Start full-stack development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### 2. Database Initialization
To automatically detect, install, and configure PostgreSQL on port 5432:

```bash
npm run setup:pg
```

---

## 🏭 Production Deployment Guide (On Your Own Server)

This step-by-step process guides you through hosting and launching the system on your own Ubuntu/Debian Linux VPS or Dedicated Server.

### 📋 Recommended Server Specifications
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS or Debian 12
- **CPU**: 2 vCPUs minimum (4 vCPUs recommended for multi-branch workloads)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Disk**: 20 GB SSD / NVMe minimum

---

### Step 1: Install Server Prerequisites

Connect to your server via SSH and install Node.js, PostgreSQL, Nginx, PM2, and Certbot:

```bash
# Update System Packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git nginx postgresql postgresql-contrib

# Install PM2 Process Manager globally
sudo npm install -g pm2

# Install Certbot for Free SSL Certificates
sudo apt install -y certbot python3-certbot-nginx
```

---

### Step 2: Configure PostgreSQL Database

1. Switch to the `postgres` user and enter PostgreSQL prompt:
```bash
sudo -u postgres psql
```

2. Create database, user, and grant privileges:
```sql
CREATE DATABASE inventory_db;
CREATE USER inventory_user WITH PASSWORD 'YourVeryStrongProductionPassword123!';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
\c inventory_db
GRANT ALL ON SCHEMA public TO inventory_user;
\q
```

3. Import the 17-Table Schema:
```bash
# Clone or copy your project repository to /var/www/enterprise-erp
cd /var/www/enterprise-erp

# Import database schema directly into PostgreSQL
PGPASSWORD='YourVeryStrongProductionPassword123!' psql -h localhost -U inventory_user -d inventory_db -f scripts/schema.sql
```

---

### Step 3: Configure Production Environment Variables

Create a `.env` file in the project root:

```bash
nano /var/www/enterprise-erp/.env
```

Add your production parameters:

```env
NODE_ENV=production
PORT=3000

# PostgreSQL Database Connection String
DATABASE_URL="postgres://inventory_user:YourVeryStrongProductionPassword123!@localhost:5432/inventory_db"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="inventory_db"
POSTGRES_USER="inventory_user"
POSTGRES_PASSWORD="YourVeryStrongProductionPassword123!"

# Secret Key for Sessions / Tokens
JWT_SECRET="e9a8f7c6b5a43210123456789abcdef0123456789abcdef0123456789abcdef"

# Gemini AI API Key (Optional: For AI Assistant integration)
GEMINI_API_KEY="your-production-gemini-api-key"

# Domain URL
APP_URL="https://erp.yourdomain.com"
```

---

### Step 4: Build Application for Production

Run the production build script to compile Vite assets to `dist/` and bundle `server.ts` into a standalone CJS binary `dist/server.cjs`:

```bash
cd /var/www/enterprise-erp
npm install --production=false
npm run build
```

---

### Step 5: Start & Manage Application with PM2

Start the application with PM2 cluster mode and configure auto-restart on system boot:

```bash
# Start using the PM2 configuration file
pm2 start ecosystem.config.js

# Save PM2 state and enable startup hook
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

To monitor your app:
```bash
pm2 status
pm2 logs enterprise-erp
pm2 monit
```

---

### Step 6: Configure Nginx Reverse Proxy & HTTPS

1. Create a new Nginx site configuration:
```bash
sudo nano /etc/nginx/sites-available/enterprise-erp
```

2. Paste the following configuration (replace `erp.yourdomain.com` with your actual domain or IP address):

```nginx
server {
    listen 80;
    server_name erp.yourdomain.com;

    # Client body size limit for file uploads (Invoices, Documents)
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # WebSockets support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site and test Nginx configuration:
```bash
sudo ln -s /etc/nginx/sites-available/enterprise-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. Enable HTTPS / SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d erp.yourdomain.com
```

---

### 🐳 Alternative Deployment Option: Docker & Docker Compose

If you prefer containerized deployment using Docker:

1. Build and run using Docker Compose:
```bash
# Build the production multi-stage container image
docker build -t enterprise-erp:latest .

# Run the container
docker run -d \
  --name enterprise-erp \
  --restart always \
  -p 3000:3000 \
  --env-file .env \
  enterprise-erp:latest
```

---

## 🔒 Production Security & Pre-Flight Checklist

Before making the application live for users:

- [ ] **Change Passwords**: Ensure PostgreSQL passwords and Super Admin default passwords (`admin123`) are updated immediately in the app database.
- [ ] **Firewall Setup (UFW)**: Allow only ports 80, 443, and 22:
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] **Database Backup Schedule**: Setup a daily cron job for PostgreSQL backup:
  ```bash
  crontab -e
  # Add daily backup at 2:00 AM:
  0 2 * * * pg_dump -U inventory_user -h localhost inventory_db | gzip > /var/backups/inventory_db_$(date +\%Y\%m\%d).sql.gz
  ```
- [ ] **Log Rotation**: Configure PM2 logrotate:
  ```bash
  pm2 install pm2-logrotate
  ```

---

## 🛠️ Operational Commands Reference

| Action | Command |
| :--- | :--- |
| **Check App Status** | `pm2 status` |
| **View Live Logs** | `pm2 logs enterprise-erp` |
| **Restart App** | `pm2 restart enterprise-erp` |
| **Rebuild Production Assets** | `npm run build && pm2 restart enterprise-erp` |
| **Check Nginx Logs** | `sudo tail -f /var/log/nginx/error.log` |
| **Manual DB Backup** | `pg_dump -U inventory_user inventory_db > backup.sql` |

---

## 📄 License

This project is licensed under the MIT License.


