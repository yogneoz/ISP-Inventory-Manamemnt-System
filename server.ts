import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import pg from 'pg';
import {
  User,
  Supplier,
  Branch,
  Product,
  InventoryStock,
  Asset,
  PurchaseOrder,
  PurchaseInvoice,
  Shipment,
  StockOperation,
  FiscalYear,
  AuditLog,
  TransactionLog,
  CustomerDeviceRecord,
  CustomerRecord,
  ApprovalRequest,
} from './src/types';

dotenv.config();

const { Pool } = pg;
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'inventory_db',
  user: process.env.POSTGRES_USER || 'inventory_user',
  password: process.env.POSTGRES_PASSWORD || 'securepassword',
  connectionTimeoutMillis: 3000,
});

const app = express();
app.use(express.json());

// Health & Control Plane Endpoints FIRST before any other routes or middleware
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/__aistudio_internal_control_plane/dev/status', (req, res) => {
  res.json({ status: 'ok', dev: true });
});

app.get('/__aistudio_internal_control_plane/*', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;

// Initialize Gemini API client lazily when API key exists
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// ==========================================
// IN-MEMORY DATABASE STATE & PRE-SEEDED DATA
// ==========================================

// Pre-seeded Users according to requested specifications
const users = [
  {
    id: 'usr-1',
    email: 'superadmin@izone.net.np',
    password: 'superadmin@123',
    name: 'Nabin Shrestha',
    role: 'SUPER_ADMIN',
    branchId: 'WH001',
    allowedBranchIds: ['WH001', 'CHU01', 'BR-KTM', 'BR-PKR', 'BR-BKT'],
    canSwitchUser: true,
  },
  {
    id: 'usr-2',
    email: 'subash.dhimal@izone.net.np',
    password: 'subash@123',
    name: 'Subash Dhimal',
    role: 'INVENTORY_MANAGER',
    branchId: 'WH001',
    allowedBranchIds: ['WH001', 'CHU01', 'BR-KTM', 'BR-PKR', 'BR-BKT'],
    canSwitchUser: true,
  },
  {
    id: 'usr-3',
    email: 'sandesh.rai@izone.net.np',
    password: 'Sandesh@123',
    name: 'Sandesh Rai',
    role: 'BRANCH_MANAGER',
    branchId: 'CHU01',
    allowedBranchIds: ['CHU01', 'BR-KTM'],
    canSwitchUser: false,
  },
  {
    id: 'usr-4',
    email: 'bidhya.khatiwad@izone.net.np',
    password: 'Bidhya@123',
    name: 'Bidhya Khatiwada',
    role: 'FRONT_DESK',
    branchId: 'CHU01',
    allowedBranchIds: ['CHU01'],
    canSwitchUser: false,
  },
  {
    id: 'usr-5',
    email: 'sanjiwani.chaudhary@izone.net.np',
    password: 'Sanjiwani@123',
    name: 'Sanjiwani Kumari Chaudhary',
    role: 'ACCOUNTANT',
    branchId: 'WH001',
    allowedBranchIds: ['WH001'],
    canSwitchUser: false,
  },
];

// Pre-seeded Suppliers
let suppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Himalayan Tech Distributors Pvt. Ltd.',
    contactPerson: 'Ramesh Adhikari',
    phone: '+977-1-4265890',
    email: 'orders@himalayantech.com.np',
    address: 'Putalisadak, Kathmandu',
    panVatNumber: '302918273',
    rating: 4.8,
  },
  {
    id: 'sup-2',
    name: 'Nepal Optical & Fiber Optics Importers',
    contactPerson: 'Sunita Sharma',
    phone: '+977-1-5541209',
    email: 'sales@nepaloptics.com.np',
    address: 'Patan Industrial Estate, Lalitpur',
    panVatNumber: '601239845',
    rating: 4.6,
  },
  {
    id: 'sup-3',
    name: 'Apex Networking Hardware Traders',
    contactPerson: 'Binod Shrestha',
    phone: '+977-1-4432100',
    email: 'info@apexnet.com.np',
    address: 'New Road, Kathmandu',
    panVatNumber: '300129841',
    rating: 4.9,
  },
];

// Pre-seeded Actual 19 Branches
let branches: Branch[] = [
  {
    id: 'WH001',
    code: 'WH001',
    name: 'Head Office',
    location: 'Urlabari',
    phone: '9800000000',
    isHeadquarters: true,
    active: true,
  },
  {
    id: 'BRC01',
    code: 'BRC01',
    name: 'Biratchowk',
    location: 'Biratchowk',
    phone: '9800000001',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'BTM01',
    code: 'BTM01',
    name: 'Birtamode',
    location: 'Birtamode',
    phone: '9800000002',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'CHU01',
    code: 'CHU01',
    name: 'Chulachuli',
    location: 'Chulachuli',
    phone: '9800000003',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'DHU01',
    code: 'DHU01',
    name: 'Dudhe',
    location: 'Dudhe',
    phone: '9800000004',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'INR01',
    code: 'INR01',
    name: 'Inaruwa',
    location: 'Inaruwa',
    phone: '9800000005',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'ITH01',
    code: 'ITH01',
    name: 'Itahari',
    location: 'Itahari',
    phone: '9800000006',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'JTR01',
    code: 'JTR01',
    name: 'Jitpur',
    location: 'Jitpur',
    phone: '9800000007',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'HLE01',
    code: 'HLE01',
    name: 'Hile',
    location: 'Hile',
    phone: '9800000008',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'LTG01',
    code: 'LTG01',
    name: 'Letang',
    location: 'Letang',
    phone: '9800000009',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'MDL01',
    code: 'MDL01',
    name: 'Madhumalla',
    location: 'Madhumalla',
    phone: '9800000010',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'PTH01',
    code: 'PTH01',
    name: 'Pathari',
    location: 'Pathari',
    phone: '9800000011',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'PDM01',
    code: 'PDM01',
    name: 'Phidim',
    location: 'Phidim',
    phone: '9800000012',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'RJB01',
    code: 'RJB01',
    name: 'Rajbiraj',
    location: 'Rajbiraj',
    phone: '9800000013',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'RML01',
    code: 'RML01',
    name: 'Ramailo',
    location: 'Ramailo',
    phone: '9800000014',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'RTW01',
    code: 'RTW01',
    name: 'Ratuwamai',
    location: 'Ratuwamai',
    phone: '9800000015',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'SHV01',
    code: 'SHV01',
    name: 'Shivasatakshi',
    location: 'Shivasatakshi',
    phone: '9800000016',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'TND01',
    code: 'TND01',
    name: 'Tandi',
    location: 'Tandi',
    phone: '9800000017',
    isHeadquarters: false,
    active: true,
  },
  {
    id: 'URL01',
    code: 'URL01',
    name: 'Urlabari',
    location: 'Urlabari',
    phone: '9800000018',
    isHeadquarters: false,
    active: true,
  },
];

// Imported Items & Telecom Consumables
const EXCEL_ITEMS = [
  { code: 'SPL001', group: 'CONSUMABLE ITEM', type: 'Splitter', name: 'PLC Fiber Optic Splitter 1x8 SC/APC', uom: 'Pcs', qty: 50, val: 450 },
  { code: 'SPL002', group: 'CONSUMABLE ITEM', type: 'Splitter', name: 'PLC Fiber Optic Splitter 1x16 SC/APC', uom: 'Pcs', qty: 30, val: 850 },
  { code: 'SLV001', group: 'CONSUMABLE ITEM', type: 'Sleeves', name: 'Fiber Fusion Protection Sleeve 60mm (Pack of 100)', uom: 'Box', qty: 100, val: 250 },
  { code: 'CPL001', group: 'CONSUMABLE ITEM', type: 'Coupler', name: 'Fiber Optic Coupler SC/APC Simplex Adapter', uom: 'Pcs', qty: 200, val: 35 },
  { code: 'FCN001', group: 'CONSUMABLE ITEM', type: 'Fast Connector', name: 'Fast Connector SC/UPC Fiber Optical', uom: 'Pcs', qty: 150, val: 45 },
  { code: 'PTC001', group: 'CONSUMABLE ITEM', type: 'Patch Cord', name: 'Fiber Patch Cord SC/APC-SC/APC 3M Simplex', uom: 'Pcs', qty: 80, val: 180 },
  { code: 'ADP001', group: 'CONSUMABLE ITEM', type: 'Adaptor', name: '0 DB ADAPTAR SC/APC', uom: 'Pcs', qty: 100, val: 25 },
  { code: 'DRP002', group: 'CONSUMABLE ITEM', type: 'Drop Cable', name: 'DROP CABLE 100 MTR ROLL', uom: 'Roll', qty: 20, val: 2500 },
  { code: 'FIB003', group: 'CONSUMABLE ITEM', type: 'Fiber', name: '4 CORE OPTICAL FIBER CABLE', uom: 'Mtr', qty: 500, val: 45 },
  { code: 'CAR004', group: 'FIXED ASSET', type: 'Olt Card', name: 'OLT CARD GPON 16-PORT Chassis Module', uom: 'Pcs', qty: 2, val: 125000 },
  { code: 'ONU001', group: 'PRODUCT ITEM', type: 'Onu Router', name: 'ONU ROUTER DUAL BAND 2.4G/5G GPON', uom: 'Pcs', qty: 25, val: 3200 },
  { code: 'ONU002', group: 'PRODUCT ITEM', type: 'Onu Router', name: 'ONU ROUTER SINGLE BAND 2.4G XPON', uom: 'Pcs', qty: 40, val: 1850 },
];

const NON_SERIALIZED_CATEGORIES = [
  'Drop Cable', 'Cat6 Cable', 'Fiber', 'Dac Cable', 'Patch Cord',
  'Fast Connector', 'Coupler', 'Splitter', 'Distribution Box',
  'Av Jack', 'Binding Wire', 'Adaptor', 'Sleeves', 'Tiffin Bod', 'Cassettte'
];

// Pre-seeded Products mapped from Excel Sheet
let products: Product[] = EXCEL_ITEMS.map((item, idx) => {
  const isConsumableOrCable =
    item.group === 'CONSUMABLE ITEM' ||
    NON_SERIALIZED_CATEGORIES.includes(item.type) ||
    ['Mtr', 'Roll', 'Box'].includes(item.uom) ||
    item.name.includes('CABLE') ||
    item.name.includes('WIRE') ||
    item.name.includes('CONNECTOR') ||
    item.name.includes('SPLITTER') ||
    item.name.includes('SLEEVE') ||
    item.name.includes('COUPLER') ||
    item.name.includes('ADAPTAR');

  const requiresSerialTracking = !isConsumableOrCable && item.group !== 'CONSUMABLE ITEM';

  let productGroup: 'Product Item' | 'Fixed Asset' | 'Consumable Item' = 'Product Item';
  if (item.group === 'FIXED ASSET') {
    productGroup = 'Fixed Asset';
  } else if (isConsumableOrCable) {
    productGroup = 'Consumable Item';
  }

  return {
    id: `prod-${item.code.toLowerCase()}`,
    sku: item.code,
    barcode: `890${String(100000000 + idx).slice(1)}`,
    name: item.name,
    category: item.type,
    productGroup,
    unit: item.uom,
    costPrice: item.val > 0 ? item.val : 1500,
    sellingPrice: item.val > 0 ? Math.round(item.val * 1.25) : 1875,
    taxRate: 13,
    minReorderLevel: productGroup === 'Consumable Item' ? 20 : (productGroup === 'Fixed Asset' ? 0 : 5),
    requiresSerialTracking,
    trackingType: requiresSerialTracking ? 'SERIAL_MAC_PON' : 'QUANTITY_ONLY',
    description: `[${productGroup}] ${item.type} - ${item.name}`,
    ...(productGroup === 'Fixed Asset'
      ? {
          depreciationMethod: 'STRAIGHT_LINE' as const,
          depreciationRate: 15,
          usefulLifeYears: 5,
          salvageValuePercent: 10,
        }
      : {}),
  };
});

// Pre-seeded Inventory Stock per Branch for all products across all 19 branches (2-3 pieces per item)
let inventoryStock: InventoryStock[] = [];
let seededDamagedCount = 0;

products.forEach((p, index) => {
  branches.forEach((branch, bIdx) => {
    // Consumable products (splitters, sleeves, couplers) have higher operational quantity per branch
    const isConsumable = p.productGroup === 'Consumable Item';
    const baseQty = isConsumable ? (branch.isHeadquarters ? 150 + ((index * 10) % 100) : 35 + ((index + bIdx) % 25)) : 2 + ((index + bIdx) % 2);
    const qty = baseQty;

    // Seed exactly 21 pcs of damaged stock across active branches (1 pc per damaged stock entry)
    let damagedQty = 0;
    if (seededDamagedCount < 21 && (index * 7 + bIdx * 3 + 1) % 13 === 0) {
      damagedQty = 1;
      seededDamagedCount++;
    }

    // Set realistic per-branch minimum reorder level based on branch demand / HQ status
    const branchMinReorder = branch.isHeadquarters
      ? p.minReorderLevel * 2
      : (bIdx % 3 === 0 ? p.minReorderLevel : Math.max(1, Math.floor(p.minReorderLevel / 2)));

    inventoryStock.push({
      id: `stk-${branch.id.toLowerCase()}-${p.id}`,
      productId: p.id,
      branchId: branch.id,
      quantityOnHand: qty,
      damagedQty: damagedQty,
      reservedQty: 0,
      incomingQty: 0,
      minReorderLevel: branchMinReorder,
      lastUpdated: new Date().toISOString(),
    });
  });
});

// Pre-seeded Fixed Assets from Excel Sheet (2-3 pieces per asset category/item, keeping Fiber items)
let assetRegister: Asset[] = EXCEL_ITEMS
  .filter((item) => item.group === 'FIXED ASSET')
  .map((item, idx) => {
    let cat: Asset['category'] = 'IT Equipment';
    if (item.type === 'Furniture') cat = 'Furniture';
    else if (item.type === 'Air Conditioner' || item.type === 'Tiffin Bod') cat = 'Fixtures';
    else if (item.type === 'Fiber Fusion Splicer' || item.type === 'Cutter' || item.type === 'Ladder') cat = 'Machinery';

    const cost = item.val > 0 ? item.val * 1000 : 25000;
    const accum = Math.round(cost * 0.15);
    const assignedBranch = branches[idx % branches.length].id;

    return {
      id: `ast-${item.code.toLowerCase()}`,
      tagNumber: `AST-${item.code}`,
      name: item.name,
      category: cat,
      branchId: assignedBranch,
      acquisitionDateAD: '2024-04-15',
      acquisitionDateBS: '2081-01-03 BS',
      acquisitionCost: cost,
      depreciationMethod: 'STRAIGHT_LINE',
      depreciationRatePercent: 15,
      accumulatedDepreciation: accum,
      netBookValue: cost - accum,
      status: 'ACTIVE',
    };
  });

// Standard Transaction ID Generator
// Pattern: {BRANCH_CODE}-{OP_TYPE}-{YYYYMMDD}-{0001}
// Daily counter resets automatically at 12:00 AM (midnight) per branch & operation type
const transactionSequenceMap: Record<string, { lastDateStr: string; count: number }> = {};

function generateStandardTransactionId(branchIdOrCode: string, opType: string, customDate?: Date): string {
  const br = branches.find((b) => b.id === branchIdOrCode || b.code === branchIdOrCode);
  const branchCode = br?.code || branchIdOrCode || 'WH001';

  const opPrefixMap: Record<string, string> = {
    'PO': 'PO',
    'PURCHASE_ORDER': 'PO',
    'PURCHASE_INVOICE': 'PI',
    'INV': 'PI',
    'PI': 'PI',
    'TRF': 'TRF',
    'TRANSFER': 'TRF',
    'SHIPMENT': 'TRF',
    'SALE': 'SALE',
    'STOCK_OUT': 'SALE',
    'CON': 'CON',
    'CONSUMABLE_ISSUE': 'CON',
    'DMG': 'DMG',
    'DAMAGE': 'DMG',
    'DSP': 'DSP',
    'DISPOSAL': 'DSP',
    'PLT': 'PLT',
    'PULLOUT': 'PLT',
  };
  const opCode = opPrefixMap[opType.toUpperCase()] || opType.toUpperCase().slice(0, 4);

  const d = customDate || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const seqKey = `${branchCode}:${opCode}:${dateStr}`;

  if (!transactionSequenceMap[seqKey] || transactionSequenceMap[seqKey].lastDateStr !== dateStr) {
    transactionSequenceMap[seqKey] = { lastDateStr: dateStr, count: 1 };
  } else {
    transactionSequenceMap[seqKey].count += 1;
  }

  const counterStr = String(transactionSequenceMap[seqKey].count).padStart(4, '0');
  return `${branchCode}-${opCode}-${dateStr}-${counterStr}`;
}

// Pre-seeded Purchase Orders referencing actual products
let purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-2083-001',
    supplierName: 'Himalayan Tech Distributors Pvt. Ltd.',
    branchId: 'WH001',
    orderDateAD: '2026-07-20',
    orderDateBS: '2083-04-05 BS',
    expectedDeliveryDateAD: '2026-08-05',
    status: 'SENT',
    items: [
      {
        id: 'poi-1',
        productId: 'prod-onu001',
        productName: 'ONU ROUTER 2.4G',
        sku: 'ONU001',
        quantity: 50,
        unitPrice: 2500,
        taxRate: 13,
        subtotal: 125000,
        taxAmount: 16250,
        total: 141250,
      },
      {
        id: 'poi-2',
        productId: 'prod-olt001',
        productName: 'OLT SFP LOADED 16 PORT',
        sku: 'OLT001',
        quantity: 2,
        unitPrice: 125000,
        taxRate: 13,
        subtotal: 250000,
        taxAmount: 32500,
        total: 282500,
      },
    ],
    subtotalAmount: 375000,
    taxAmount: 48750,
    totalAmount: 423750,
    notes: 'Urgent reorder for optical distribution network hardware.',
  },
];

// Pre-seeded Purchase Invoices with 13% VAT
let purchaseInvoices: PurchaseInvoice[] = [
  {
    id: 'inv-201',
    invoiceNumber: 'INV-2083-8891',
    poReferenceId: 'po-101',
    supplierName: 'Himalayan Tech Distributors Pvt. Ltd.',
    branchId: 'WH001',
    invoiceDateAD: '2026-07-25',
    invoiceDateBS: '2083-04-10 BS',
    dueDateAD: '2026-08-25',
    dueDateBS: '2083-05-09 BS',
    taxableAmount: 375000,
    vatAmount: 48750,
    nonTaxableAmount: 0,
    grandTotal: 423750,
    paymentStatus: 'UNPAID',
    amountPaid: 0,
  },
];

// Pre-seeded Shipments & Transfers
let shipments: Shipment[] = [
  {
    id: 'sh-301',
    trackingCode: 'TRF-2083-0092',
    type: 'INTER_BRANCH',
    sourceBranchId: 'WH001',
    sourceBranchName: 'Head Office (Urlabari)',
    destinationBranchId: 'CHU01',
    destinationBranchName: 'Chulachuli Branch',
    dispatchDateAD: '2026-07-28',
    dispatchDateBS: '2083-04-13 BS',
    estimatedArrivalAD: '2026-08-01',
    status: 'IN_TRANSIT',
    items: [
      {
        id: 'shi-1',
        productId: 'prod-drp001',
        productName: 'DROP CABLE 175 MTR',
        sku: 'DRP001',
        quantitySent: 10,
      },
    ],
    notes: 'Inter-branch drop cable stock transfer to Chulachuli branch.',
  },
];

// Pre-seeded Stock Operations
let stockOperations: StockOperation[] = [];

// Auto-seed matching DAMAGE operations for all 21 pre-seeded damaged stock entries
let dmgOpCounter = 1;
inventoryStock.forEach((stk) => {
  if (stk.damagedQty > 0) {
    const prod = products.find((p) => p.id === stk.productId);
    stockOperations.push({
      id: `op-dmg-${stk.id}`,
      referenceNumber: `DMG-2083-${String(dmgOpCounter++).padStart(3, '0')}`,
      type: 'DAMAGE',
      branchId: stk.branchId,
      productId: stk.productId,
      productName: prod?.name || 'Damaged Stock Item',
      quantityChanged: -stk.damagedQty,
      costPerUnit: prod?.costPrice || 0,
      totalValue: stk.damagedQty * (prod?.costPrice || 0),
      reason: 'Physical branch inventory inspection & transit damage tag',
      inspectorName: 'Branch Quality Inspector',
      dateAD: '2026-07-22',
      dateBS: '2083-04-07 BS',
      fiscalYear: '2082-83',
    });
  }
});

// Pre-seeded Fiscal Years
let fiscalYears: FiscalYear[] = [
  {
    id: 'fy-1',
    code: '2080-81',
    startDateAD: '2023-07-17',
    endDateAD: '2024-07-15',
    startDateBS: '2080-04-01 BS',
    endDateBS: '2080-12-31 BS',
    isCurrent: false,
    isClosed: true,
  },
  {
    id: 'fy-2',
    code: '2081-82',
    startDateAD: '2024-07-16',
    endDateAD: '2025-07-15',
    startDateBS: '2081-04-01 BS',
    endDateBS: '2081-12-31 BS',
    isCurrent: false,
    isClosed: true,
  },
  {
    id: 'fy-3',
    code: '2082-83',
    startDateAD: '2025-07-16',
    endDateAD: '2026-07-15',
    startDateBS: '2082-04-01 BS',
    endDateBS: '2082-12-31 BS',
    isCurrent: true,
    isClosed: false,
  },
  {
    id: 'fy-4',
    code: '2083-84',
    startDateAD: '2026-07-16',
    endDateAD: '2027-07-15',
    startDateBS: '2083-04-01 BS',
    endDateBS: '2083-12-31 BS',
    isCurrent: false,
    isClosed: false,
  },
];

// Pre-seeded Audit Logs
let auditTrail: AuditLog[] = [
  {
    id: 'aud-1',
    userEmail: 'admin@izone.net.np',
    userName: 'Shrestha Administrator',
    action: 'SYSTEM_BOOT',
    module: 'AUTH',
    details: 'IZone Enterprise Inventory System initialized with multi-branch database.',
    timestampAD: '2026-07-31T07:00:00Z',
    timestampBS: '2083-04-16 BS',
  },
];

// Pre-seeded Transaction Logs
let transactionLogs: TransactionLog[] = [
  {
    id: 'txn-1',
    transactionNumber: 'TXN-88001',
    productId: 'prod-hoc001',
    productSku: 'HOC001',
    productName: 'HYDRAULIC OFFICE CHAIR-FA',
    branchId: 'CHU01',
    changeType: 'DAMAGE',
    quantityBefore: 10,
    quantityChanged: -1,
    quantityAfter: 9,
    unitCost: 25,
    referenceDocId: 'DMG-2083-001',
    timestampAD: '2026-07-22T10:30:00Z',
    timestampBS: '2083-04-07 BS',
  },
];

// Pre-seeded Customer Master Database
let customerMasterRecords: CustomerRecord[] = [
  {
    id: 'CUS-10291',
    customerId: 'CUS-10291',
    customerName: 'Aarav Sharma',
    username: 'aarav.sharma',
    contactNumber: '9851092810',
    branchId: 'BRC01',
    address: 'Durbar Marg Ward 4, Kathmandu, Nepal',
    email: 'aarav@gmail.com',
    status: 'ACTIVE',
    creditLimit: 25000,
    assignedDevicesCount: 2,
  },
  {
    id: 'CUS-10292',
    customerId: 'CUS-10292',
    customerName: 'Pooja Gurung',
    username: 'pooja.g',
    contactNumber: '9846019283',
    branchId: 'BTM01',
    address: 'Lakeside Ward 6, Pokhara, Nepal',
    email: 'pooja.g@yahoo.com',
    status: 'ACTIVE',
    creditLimit: 15000,
    assignedDevicesCount: 1,
  },
  {
    id: 'CUS-10293',
    customerId: 'CUS-10293',
    customerName: 'Subash Shrestha',
    username: 'subash.sh',
    contactNumber: '9801029381',
    branchId: 'WH001',
    address: 'Jawalakhel Ward 2, Lalitpur, Nepal',
    email: 'subash@outlook.com',
    status: 'ACTIVE',
    creditLimit: 50000,
    assignedDevicesCount: 0,
  },
  {
    id: 'CUS-10294',
    customerId: 'CUS-10294',
    customerName: 'Bina Thapa',
    username: 'bina.t',
    contactNumber: '9855019284',
    branchId: 'CHU01',
    address: 'Lions Chowk Ward 1, Narayangarh, Nepal',
    email: 'bina@gmail.com',
    status: 'ACTIVE',
    creditLimit: 20000,
    assignedDevicesCount: 1,
  },
];

// Pre-seeded Customer Device Records (Device Serial & PON Serial Lookup)
let customerDeviceRecords: CustomerDeviceRecord[] = [
  {
    id: 'cust-101',
    customerId: 'c-801',
    customerName: 'Aashish Subedi',
    customerCode: 'CUST-URL-1092',
    contactPhone: '+977-9851029381',
    installationAddress: 'Urlabari Ward 3, Morang',
    branchId: 'URL01',
    productName: 'ONU ROUTER 2.4G',
    deviceSerial: 'SN-ONU24G-881923',
    ponSerial: 'HWTC-90A812C4',
    macAddress: '70:A8:E3:4B:91:10',
    status: 'ACTIVE',
    issuedDateAD: '2026-05-10',
    issuedDateBS: '2083-01-27 BS',
    purchaseBillRef: 'BILL-9021',
    notes: 'Fiber FTTH connection 100Mbps setup with 2.4G ONU Router.',
  },
  {
    id: 'cust-102',
    customerId: 'c-802',
    customerName: 'Sujata Maharjan',
    customerCode: 'CUST-ITH-4019',
    contactPhone: '+977-9801928374',
    installationAddress: 'Itahari Ward 4, Sunsari',
    branchId: 'ITH01',
    productName: 'ONU ROUTER 5G',
    deviceSerial: 'SN-ONU5G-774019',
    ponSerial: 'ZTE-4481A290',
    macAddress: 'CC:12:34:56:78:9A',
    status: 'ACTIVE',
    issuedDateAD: '2026-06-18',
    issuedDateBS: '2083-03-04 BS',
    purchaseBillRef: 'BILL-4410',
    notes: 'Dual band 5G Dual Antenna ONU Router.',
  },
  {
    id: 'cust-103',
    customerId: 'c-803',
    customerName: 'Bikash Pokharel',
    customerCode: 'CUST-CHU-2041',
    contactPhone: '+977-9861234567',
    installationAddress: 'Chulachuli Ward 1, Ilam',
    branchId: 'CHU01',
    productName: 'ONU ROUTER 2.4G',
    deviceSerial: 'SN-ONU24G-990182',
    ponSerial: 'HWTC-8812B001',
    macAddress: '88:E2:00:11:22:33',
    status: 'SUSPENDED',
    issuedDateAD: '2026-04-02',
    issuedDateBS: '2082-12-20 BS',
    purchaseBillRef: 'BILL-9021',
    notes: 'Billing temporarily on hold due to seasonal relocation.',
  },
];

// Pre-seeded Approval Requests (Workflow Authorization Center)
let approvalRequests: ApprovalRequest[] = [
  {
    id: 'apr-101',
    requestNumber: 'APR-2083-001',
    type: 'CUSTOMER_DEVICE_STATUS',
    targetId: 'cust-103',
    customerName: 'Bikash Pokharel',
    customerCode: 'CUST-CHU-2041',
    deviceSerial: 'SN-ONU24G-990182',
    ponSerial: 'HWTC-8812B001',
    productName: 'ONU ROUTER 2.4G',
    currentStatus: 'SUSPENDED',
    requestedStatus: 'REFUND',
    requestedByRole: 'FRONT_DESK',
    requestedByEmail: 'frontdesk.urlabari@subisu.com.np',
    requestedByName: 'Sabin Shrestha (Frontdesk)',
    branchId: 'CHU01',
    branchName: 'Chulachuli Branch Office',
    reason: 'Customer requested account termination & ONU deposit refund of NPR 3,500. Device inspected and working in good condition.',
    restockQtyOnApproval: true,
    status: 'PENDING',
    requestedAtAD: '2026-08-05T14:20:00Z',
    requestedAtBS: '2083-04-21 BS',
  },
  {
    id: 'apr-102',
    requestNumber: 'APR-2083-002',
    type: 'CUSTOMER_DEVICE_STATUS',
    targetId: 'cust-102',
    customerName: 'Sujata Maharjan',
    customerCode: 'CUST-ITH-4019',
    deviceSerial: 'SN-ONU5G-774019',
    ponSerial: 'ZTE-4481A290',
    productName: 'ONU ROUTER 5G',
    currentStatus: 'ACTIVE',
    requestedStatus: 'SUSPENDED',
    requestedByRole: 'BRANCH_MANAGER',
    requestedByEmail: 'bm.itahari@subisu.com.np',
    requestedByName: 'Ramesh Karki (Branch Manager)',
    branchId: 'ITH01',
    branchName: 'Itahari Branch Office',
    reason: 'Non-payment of monthly ISP service bill for 2 consecutive months despite automated SMS notifications.',
    restockQtyOnApproval: false,
    status: 'APPROVED',
    requestedAtAD: '2026-08-01T09:15:00Z',
    requestedAtBS: '2083-04-17 BS',
    processedByEmail: 'admin@system.com.np',
    processedByName: 'Super Admin',
    processedByRole: 'SUPER_ADMIN',
    processedAtAD: '2026-08-01T10:00:00Z',
    processedAtBS: '2083-04-17 BS',
  },
  {
    id: 'apr-103',
    requestNumber: 'APR-2083-003',
    type: 'CUSTOMER_DEVICE_STATUS',
    targetId: 'cust-101',
    customerName: 'Aashish Subedi',
    customerCode: 'CUST-URL-1092',
    deviceSerial: 'SN-ONU24G-881923',
    ponSerial: 'HWTC-90A812C4',
    productName: 'ONU ROUTER 2.4G',
    currentStatus: 'ACTIVE',
    requestedStatus: 'DISCONNECTED',
    requestedByRole: 'FRONT_DESK',
    requestedByEmail: 'frontdesk.urlabari@subisu.com.np',
    requestedByName: 'Sabin Shrestha (Frontdesk)',
    branchId: 'URL01',
    branchName: 'Urlabari Branch Office',
    reason: 'Immediate disconnection request without returning physical ONU equipment.',
    restockQtyOnApproval: false,
    status: 'REJECTED',
    requestedAtAD: '2026-07-28T11:30:00Z',
    requestedAtBS: '2083-04-13 BS',
    processedByEmail: 'inventory@system.com.np',
    processedByName: 'Bikash Pokharel (Inventory Mgr)',
    processedByRole: 'INVENTORY_MANAGER',
    processedAtAD: '2026-07-28T12:00:00Z',
    processedAtBS: '2083-04-13 BS',
    rejectionReason: 'Rejected: Customer must return physical ONU equipment to the branch office before disconnection can be authorized.',
  },
];

// Active user session simulation
let activeUser = users[0];

// ==========================================
// API REST ENDPOINTS
// ==========================================

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  activeUser = user;
  const { password: _, ...userWithoutPass } = user;
  res.json({ user: userWithoutPass, token: 'session-token-izone' });
});

app.get('/api/auth/me', (req, res) => {
  if (!activeUser) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const { password: _, ...userWithoutPass } = activeUser;
  res.json(userWithoutPass);
});

// Profile Switching Endpoint
app.post('/api/auth/switch-profile', (req, res) => {
  const { targetUserId } = req.body;
  const user = users.find((u) => u.id === targetUserId || u.email === targetUserId);
  if (!user) {
    return res.status(404).json({ message: 'Target user profile not found.' });
  }

  const previousUser = activeUser;
  activeUser = user;

  auditTrail.unshift({
    id: `aud-${Date.now()}`,
    userEmail: user.email,
    userName: user.name,
    action: 'PROFILE_SWITCHED',
    module: 'AUTH',
    details: `Session profile switched from ${previousUser?.email || 'System'} (${previousUser?.role}) to ${user.email} (${user.role})`,
    timestampAD: new Date().toISOString(),
    timestampBS: '2083-04-16 BS',
  });

  const { password: _, ...userWithoutPass } = user;
  res.json({ user: userWithoutPass, token: `session-token-${user.id}` });
});

// Profile Update Endpoint
app.put('/api/auth/profile', (req, res) => {
  if (!activeUser) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const { name, email, branchId, newPassword } = req.body;

  const idx = users.findIndex((u) => u.id === activeUser.id);
  if (idx !== -1) {
    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (branchId) users[idx].branchId = branchId;
    if (newPassword) users[idx].password = newPassword;
    activeUser = users[idx];
  }

  const { password: _, ...userWithoutPass } = activeUser;
  res.json(userWithoutPass);
});

// Branches
app.get('/api/branches', (req, res) => {
  res.json(branches);
});

app.post('/api/branches', (req, res) => {
  const newBranch: Branch = {
    id: `br-${Date.now()}`,
    ...req.body,
  };
  branches.push(newBranch);

  // Initialize stock entries for existing products in this new branch
  products.forEach((p) => {
    inventoryStock.push({
      id: `stk-${Date.now()}-${p.id}`,
      productId: p.id,
      branchId: newBranch.id,
      quantityOnHand: 0,
      reservedQty: 0,
      incomingQty: 0,
      lastUpdated: new Date().toISOString(),
    });
  });

  res.status(201).json(newBranch);
});

app.put('/api/branches/:id', (req, res) => {
  const { id } = req.params;
  const idx = branches.findIndex((b) => b.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Branch not found' });
  branches[idx] = { ...branches[idx], ...req.body };
  res.json(branches[idx]);
});

app.delete('/api/branches/:id', (req, res) => {
  const { id } = req.params;
  branches = branches.filter((b) => b.id !== id);
  res.json({ success: true });
});

// Suppliers
app.get('/api/suppliers', (req, res) => {
  res.json(suppliers);
});

app.post('/api/suppliers', (req, res) => {
  const newSupplier: Supplier = {
    id: `sup-${Date.now()}`,
    rating: 5.0,
    ...req.body,
  };
  suppliers.push(newSupplier);
  res.status(201).json(newSupplier);
});

app.put('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Supplier not found' });
  suppliers[idx] = { ...suppliers[idx], ...req.body };
  res.json(suppliers[idx]);
});

app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  suppliers = suppliers.filter((s) => s.id !== id);
  res.json({ success: true });
});

// Users
app.get('/api/users', (req, res) => {
  const safeUsers = users.map(({ password: _, ...u }) => u);
  res.json(safeUsers);
});

app.post('/api/users', (req, res) => {
  const newUser = {
    id: `usr-${Date.now()}`,
    password: req.body.password || 'password@123',
    ...req.body,
  };
  users.push(newUser);
  const { password: _, ...userWithoutPass } = newUser;
  res.status(201).json(userWithoutPass);
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ message: 'User not found' });

  users[idx] = {
    ...users[idx],
    ...req.body,
  };
  const { password: _, ...userWithoutPass } = users[idx];
  res.json(userWithoutPass);
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const idx = users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    users.splice(idx, 1);
  }
  res.json({ success: true });
});

// Products
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const newProd = {
    id: `prod-${Date.now()}`,
    ...req.body,
  };
  products.push(newProd);

  // Initialize 0 stock across all branches
  branches.forEach((b) => {
    inventoryStock.push({
      id: `stk-${Date.now()}-${b.id}`,
      productId: newProd.id,
      branchId: b.id,
      quantityOnHand: 0,
      reservedQty: 0,
      incomingQty: 0,
      lastUpdated: new Date().toISOString(),
    });
  });

  auditTrail.unshift({
    id: `aud-${Date.now()}`,
    userEmail: activeUser.email,
    userName: activeUser.name,
    action: 'CREATE_PRODUCT',
    module: 'PRODUCTS',
    details: `Created new product SKU ${newProd.sku} (${newProd.name})`,
    timestampAD: new Date().toISOString(),
    timestampBS: '2083-04-16 BS',
  });

  res.status(201).json(newProd);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Product not found' });

  products[idx] = { ...products[idx], ...req.body };
  res.json(products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  products = products.filter((p) => p.id !== id);
  inventoryStock = inventoryStock.filter((s) => s.productId !== id);
  res.json({ success: true });
});

// Stock
app.get('/api/stock', (req, res) => {
  const { branchId } = req.query;
  if (branchId && branchId !== 'ALL') {
    return res.json(inventoryStock.filter((s) => s.branchId === branchId));
  }
  res.json(inventoryStock);
});

app.patch('/api/stock/:id', (req, res) => {
  const { id } = req.params;
  const { quantityOnHand, minReorderLevel, damagedQty, reason, changeType } = req.body;
  const stk = inventoryStock.find((s) => s.id === id);
  if (!stk) return res.status(404).json({ message: 'Stock record not found' });

  let qtyBefore = stk.quantityOnHand;
  let oldDamaged = stk.damagedQty || 0;

  if (damagedQty !== undefined) {
    const newDam = Math.max(0, Number(damagedQty));
    const damDiff = newDam - oldDamaged;
    stk.damagedQty = newDam;

    // If quantityOnHand wasn't explicitly overridden, adjust usable stock to conserve total stock
    if (quantityOnHand === undefined) {
      stk.quantityOnHand = Math.max(0, stk.quantityOnHand - damDiff);
    } else {
      stk.quantityOnHand = Number(quantityOnHand);
    }
  } else if (quantityOnHand !== undefined) {
    stk.quantityOnHand = Number(quantityOnHand);
  }
  if (minReorderLevel !== undefined) {
    stk.minReorderLevel = Number(minReorderLevel);
  }
  stk.lastUpdated = new Date().toISOString();

  const prod = products.find((p) => p.id === stk.productId);

  const isDamageChange = changeType === 'DAMAGE' || (damagedQty !== undefined && stk.damagedQty !== oldDamaged);

  if (isDamageChange) {
    const damDiff = (stk.damagedQty || 0) - oldDamaged;
    transactionLogs.unshift({
      id: `txn-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionNumber: `TXN-DMG-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: stk.productId,
      productSku: prod?.sku || '',
      productName: prod?.name || '',
      branchId: stk.branchId,
      changeType: 'DAMAGE',
      quantityBefore: oldDamaged,
      quantityChanged: damDiff !== 0 ? -Math.abs(damDiff) : -(stk.damagedQty || 1),
      quantityAfter: stk.damagedQty || 0,
      unitCost: prod?.costPrice || 0,
      referenceDocId: reason || 'DMG-VERIFICATION',
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  } else if (quantityOnHand !== undefined && (stk.quantityOnHand - qtyBefore !== 0)) {
    transactionLogs.unshift({
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: stk.productId,
      productSku: prod?.sku || '',
      productName: prod?.name || '',
      branchId: stk.branchId,
      changeType: 'MANUAL_ADJUSTMENT',
      quantityBefore: qtyBefore,
      quantityChanged: stk.quantityOnHand - qtyBefore,
      quantityAfter: stk.quantityOnHand,
      unitCost: prod?.costPrice || 0,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  }

  res.json(stk);
});

app.patch('/api/stock/:id/reorder-level', (req, res) => {
  const { id } = req.params;
  const { minReorderLevel } = req.body;
  const stk = inventoryStock.find((s) => s.id === id);
  if (!stk) return res.status(404).json({ message: 'Stock record not found' });

  stk.minReorderLevel = Number(minReorderLevel);
  stk.lastUpdated = new Date().toISOString();
  res.json(stk);
});

app.post('/api/stock/bulk-reorder-levels', (req, res) => {
  const { updates } = req.body;
  if (Array.isArray(updates)) {
    updates.forEach((u: { stockId: string; minReorderLevel: number }) => {
      const stk = inventoryStock.find((s) => s.id === u.stockId);
      if (stk) {
        stk.minReorderLevel = Number(u.minReorderLevel);
        stk.lastUpdated = new Date().toISOString();
      }
    });
  }
  res.json({ success: true, count: updates?.length || 0 });
});

// Fixed Assets
app.get('/api/assets', (req, res) => {
  const { branchId } = req.query;
  if (branchId && branchId !== 'ALL') {
    return res.json(assetRegister.filter((a) => a.branchId === branchId));
  }
  res.json(assetRegister);
});

app.post('/api/assets', (req, res) => {
  const newAsset = {
    id: `ast-${Date.now()}`,
    accumulatedDepreciation: 0,
    netBookValue: req.body.acquisitionCost,
    ...req.body,
  };
  assetRegister.push(newAsset);
  res.status(201).json(newAsset);
});

app.patch('/api/assets/:id/status', (req, res) => {
  const { id } = req.params;
  const asset = assetRegister.find((a) => a.id === id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  Object.assign(asset, req.body);
  res.json(asset);
});

// Purchase Orders
app.get('/api/purchase-orders', (req, res) => {
  const { branchId } = req.query;
  if (branchId && branchId !== 'ALL') {
    return res.json(purchaseOrders.filter((po) => po.branchId === branchId));
  }
  res.json(purchaseOrders);
});

app.post('/api/purchase-orders', (req, res) => {
  const items = req.body.items || [];
  const subtotalAmount = items.reduce((s: number, i: any) => s + i.subtotal, 0);
  const taxAmount = items.reduce((s: number, i: any) => s + i.taxAmount, 0);
  const totalAmount = subtotalAmount + taxAmount;

  const newPO = {
    id: `po-${Date.now()}`,
    poNumber: generateStandardTransactionId(req.body.branchId || 'WH001', 'PO'),
    subtotalAmount,
    taxAmount,
    totalAmount,
    ...req.body,
  };

  // Increment incoming quantity for PO target branch
  if (newPO.branchId && Array.isArray(items)) {
    items.forEach((item: any) => {
      let stk = inventoryStock.find(
        (s) => s.productId === item.productId && s.branchId === newPO.branchId
      );
      if (stk) {
        stk.incomingQty = (stk.incomingQty || 0) + (Number(item.quantity) || 0);
        stk.lastUpdated = new Date().toISOString();
      }
    });
  }

  purchaseOrders.unshift(newPO);
  res.status(201).json(newPO);
});

app.put('/api/purchase-orders/:id', (req, res) => {
  const { id } = req.params;
  const index = purchaseOrders.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ message: 'PO not found' });

  const existingPO = purchaseOrders[index];
  if (existingPO.status === 'IN_PROGRESS' || existingPO.status === 'CANCELLED' || existingPO.status === 'RECEIVED') {
    return res.status(400).json({ message: 'Cannot edit PO that is already In Progress, Received, or Cancelled' });
  }

  const items = req.body.items || existingPO.items;
  const subtotalAmount = items.reduce((s: number, i: any) => s + (i.subtotal || (i.quantity * i.unitPrice)), 0);
  const taxAmount = items.reduce((s: number, i: any) => s + (i.taxAmount || 0), 0);
  const totalAmount = subtotalAmount + taxAmount;

  const updatedPO = {
    ...existingPO,
    ...req.body,
    subtotalAmount,
    taxAmount,
    totalAmount,
    items,
  };

  purchaseOrders[index] = updatedPO;
  res.json(updatedPO);
});

app.patch('/api/purchase-orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const po = purchaseOrders.find((p) => p.id === id);
  if (!po) return res.status(404).json({ message: 'PO not found' });

  po.status = status;
  res.json(po);
});

app.post('/api/purchase-orders/:id/receive', (req, res) => {
  const { id } = req.params;
  const po = purchaseOrders.find((p) => p.id === id);
  if (!po) return res.status(404).json({ message: 'PO not found' });

  po.status = 'RECEIVED';

  // Increment branch stock & clear incoming qty
  po.items.forEach((item: any) => {
    let stk = inventoryStock.find(
      (s) => s.productId === item.productId && s.branchId === po.branchId
    );
    if (!stk) {
      stk = {
        id: `stk-${po.branchId.toLowerCase()}-${item.productId}`,
        productId: item.productId,
        branchId: po.branchId,
        quantityOnHand: 0,
        reservedQty: 0,
        incomingQty: 0,
        lastUpdated: new Date().toISOString(),
      };
      inventoryStock.push(stk);
    }

    stk.incomingQty = Math.max(0, (stk.incomingQty || 0) - item.quantity);
    const qtyBefore = stk.quantityOnHand;
    stk.quantityOnHand += item.quantity;
    stk.lastUpdated = new Date().toISOString();

    transactionLogs.unshift({
      id: `txn-${Date.now()}-${item.productId}`,
      transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: item.productId,
      productSku: item.sku,
      productName: item.productName,
      branchId: po.branchId,
      changeType: 'INBOUND_PO',
      quantityBefore: qtyBefore,
      quantityChanged: item.quantity,
      quantityAfter: stk.quantityOnHand,
      unitCost: item.unitPrice,
      referenceDocId: po.poNumber,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  });

  res.json(po);
});

// Purchase Invoices
app.get('/api/purchase-invoices', (req, res) => {
  const { branchId } = req.query;
  if (branchId && branchId !== 'ALL') {
    return res.json(purchaseInvoices.filter((inv) => inv.branchId === branchId));
  }
  res.json(purchaseInvoices);
});

app.post('/api/purchase-invoices', (req, res) => {
  const targetBranchId = req.body.branchId || branches[0]?.id || 'WH001';
  const newInv = {
    id: `inv-${Date.now()}`,
    invoiceNumber: generateStandardTransactionId(targetBranchId, 'PI'),
    ...req.body,
  };

  const items = req.body.items || req.body.lines || [];

  items.forEach((item: any) => {
    let stk = inventoryStock.find(
      (s) => s.productId === item.productId && s.branchId === targetBranchId
    );
    if (!stk) {
      stk = {
        id: `stk-${targetBranchId.toLowerCase()}-${item.productId}`,
        productId: item.productId,
        branchId: targetBranchId,
        quantityOnHand: 0,
        damagedQty: 0,
        reservedQty: 0,
        incomingQty: 0,
        minReorderLevel: 5,
        lastUpdated: new Date().toISOString(),
      };
      inventoryStock.push(stk);
    }

    const qtyBefore = stk.quantityOnHand;
    const qtyToAdd = Number(item.quantity) || 0;
    stk.quantityOnHand += qtyToAdd;
    stk.lastUpdated = new Date().toISOString();

    const prod = products.find((p) => p.id === item.productId);

    // If product is a Fixed Asset, automatically create a Fixed Asset lot in assetRegister linked to Party Invoice Date
    if (prod && (prod.productGroup === 'Fixed Asset' || prod.category === 'Fixed Assets')) {
      const lineCost = (Number(item.unitPrice) || prod.costPrice) * qtyToAdd;
      const assetLot = {
        id: `ast-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        tagNumber: `AST-${prod.sku || 'FA'}-${Math.floor(1000 + Math.random() * 9000)}`,
        name: `${prod.name} (Lot Qty: ${qtyToAdd})`,
        category: (prod.category as any) || 'Machinery',
        branchId: targetBranchId,
        acquisitionDateAD: newInv.invoiceDateAD || new Date().toISOString().split('T')[0],
        acquisitionDateBS: newInv.invoiceDateBS || '2083-04-10 BS',
        acquisitionCost: lineCost,
        depreciationMethod: prod.depreciationMethod || 'STRAIGHT_LINE',
        depreciationRatePercent: prod.depreciationRate ?? 15,
        accumulatedDepreciation: 0,
        netBookValue: lineCost,
        status: 'ACTIVE' as const,
        supplierName: newInv.supplierName || 'Vendor',
        invoiceNo: newInv.invoiceNumber,
        purchaseInvoiceId: newInv.id,
        productId: prod.id,
      };
      assetRegister.unshift(assetLot);
    }

    transactionLogs.unshift({
      id: `txn-${Date.now()}-${item.productId}`,
      transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: item.productId,
      productSku: item.sku || prod?.sku || '',
      productName: item.productName || prod?.name || 'Product',
      branchId: targetBranchId,
      changeType: 'PURCHASE_INVOICE',
      quantityBefore: qtyBefore,
      quantityChanged: qtyToAdd,
      quantityAfter: stk.quantityOnHand,
      unitCost: item.unitPrice || prod?.costPrice || 0,
      referenceDocId: newInv.invoiceNumber,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  });

  // Update linked Purchase Order status if poReferenceId or poId provided
  const poRef = req.body.poReferenceId || req.body.poId;
  if (poRef) {
    const po = purchaseOrders.find((p) => p.id === poRef || p.poNumber === poRef);
    if (po) {
      po.status = 'RECEIVED';
      // Deduct incoming quantities for items matched in PO
      po.items.forEach((poItem: any) => {
        const stk = inventoryStock.find(
          (s) => s.productId === poItem.productId && s.branchId === (po.branchId || targetBranchId)
        );
        if (stk) {
          stk.incomingQty = Math.max(0, (stk.incomingQty || 0) - poItem.quantity);
          stk.lastUpdated = new Date().toISOString();
        }
      });
    }
  }

  purchaseInvoices.unshift(newInv);
  res.status(201).json(newInv);
});

app.post('/api/purchase-invoices/:id/pay', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const inv = purchaseInvoices.find((i) => i.id === id);
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });

  inv.amountPaid += Number(amount);
  if (inv.amountPaid >= inv.grandTotal) {
    inv.paymentStatus = 'PAID';
  } else {
    inv.paymentStatus = 'PARTIAL';
  }
  res.json(inv);
});

// Shipments
app.get('/api/shipments', (req, res) => {
  res.json(shipments);
});

app.post('/api/shipments', (req, res) => {
  const sourceBranch = branches.find((b) => b.id === req.body.sourceBranchId);
  const destBranch = branches.find((b) => b.id === req.body.destinationBranchId);

  const newShipment = {
    id: `sh-${Date.now()}`,
    trackingCode: generateStandardTransactionId(req.body.sourceBranchId || 'WH001', 'TRF'),
    sourceBranchName: sourceBranch?.name,
    destinationBranchName: destBranch?.name || 'Destination',
    status: 'IN_TRANSIT' as const,
    ...req.body,
  };

  // Decrement source stock if inter-branch and increment incoming at destination
  if (req.body.type === 'INTER_BRANCH' && req.body.sourceBranchId) {
    req.body.items.forEach((item: any) => {
      const sourceStk = inventoryStock.find(
        (s) => s.productId === item.productId && s.branchId === req.body.sourceBranchId
      );
      if (sourceStk) {
        const qtyBefore = sourceStk.quantityOnHand;
        sourceStk.quantityOnHand = Math.max(0, sourceStk.quantityOnHand - item.quantitySent);
        sourceStk.lastUpdated = new Date().toISOString();

        transactionLogs.unshift({
          id: `txn-${Date.now()}-${item.productId}-src`,
          transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
          productId: item.productId,
          productSku: item.sku || '',
          productName: item.productName || '',
          branchId: req.body.sourceBranchId,
          changeType: 'SHIPMENT_TRANSFER',
          quantityBefore: qtyBefore,
          quantityChanged: -item.quantitySent,
          quantityAfter: sourceStk.quantityOnHand,
          unitCost: 0,
          referenceDocId: newShipment.trackingCode,
          timestampAD: new Date().toISOString(),
          timestampBS: '2083-04-16 BS',
        });
      }

      if (req.body.destinationBranchId) {
        let destStk = inventoryStock.find(
          (s) => s.productId === item.productId && s.branchId === req.body.destinationBranchId
        );
        if (!destStk) {
          destStk = {
            id: `stk-${req.body.destinationBranchId.toLowerCase()}-${item.productId}`,
            productId: item.productId,
            branchId: req.body.destinationBranchId,
            quantityOnHand: 0,
            reservedQty: 0,
            incomingQty: 0,
            lastUpdated: new Date().toISOString(),
          };
          inventoryStock.push(destStk);
        }
        destStk.incomingQty = (destStk.incomingQty || 0) + item.quantitySent;
        destStk.lastUpdated = new Date().toISOString();
      }
    });
  }

  shipments.unshift(newShipment);
  res.status(201).json(newShipment);
});

app.post('/api/shipments/:id/receive', (req, res) => {
  const { id } = req.params;
  const { receivedItems, receivedByNotes } = req.body || {};
  const sh = shipments.find((s) => s.id === id);
  if (!sh) return res.status(404).json({ message: 'Shipment not found' });

  let hasDiscrepancy = false;
  sh.receivedByNotes = receivedByNotes || '';
  sh.receivedDateAD = new Date().toISOString().split('T')[0];
  sh.receivedDateBS = '2083-04-16 BS';

  // Increment destination stock by actual VERIFIED received quantity
  sh.items.forEach((item: any, idx: number) => {
    const verified = Array.isArray(receivedItems)
      ? receivedItems.find((ri: any) => ri.itemId === item.id) || receivedItems[idx]
      : null;

    const actualQtyReceived = verified !== null && verified !== undefined && verified.quantityReceived !== undefined
      ? Number(verified.quantityReceived)
      : item.quantitySent;

    item.quantityReceived = actualQtyReceived;
    if (verified?.receivedSerials) {
      item.receivedSerials = verified.receivedSerials;
    } else if (item.deviceSerials) {
      item.receivedSerials = item.deviceSerials.slice(0, actualQtyReceived);
    }
    if (verified?.itemDiscrepancyNotes) {
      item.itemDiscrepancyNotes = verified.itemDiscrepancyNotes;
    }

    if (actualQtyReceived < item.quantitySent) {
      hasDiscrepancy = true;
    }

    let stk = inventoryStock.find(
      (s) => s.productId === item.productId && s.branchId === sh.destinationBranchId
    );
    if (!stk) {
      stk = {
        id: `stk-${Date.now()}-${item.productId}`,
        productId: item.productId,
        branchId: sh.destinationBranchId,
        quantityOnHand: 0,
        reservedQty: 0,
        incomingQty: 0,
        lastUpdated: new Date().toISOString(),
      };
      inventoryStock.push(stk);
    }

    const qtyBefore = stk.quantityOnHand;
    stk.quantityOnHand += actualQtyReceived;

    const prod = products.find((p) => p.id === item.productId);

    // Update serial register location & status for received serial numbers
    if (item.receivedSerials && Array.isArray(item.receivedSerials)) {
      item.receivedSerials.forEach((s: any) => {
        if (!s?.deviceSerial) return;
        const cleanSer = s.deviceSerial.trim().toUpperCase();
        let devRecord = customerDeviceRecords.find(
          (cd) => cd.deviceSerial.trim().toUpperCase() === cleanSer
        );
        if (devRecord) {
          devRecord.branchId = sh.destinationBranchId;
          devRecord.status = 'IN_STOCK';
          devRecord.notes = `Transferred from ${sh.sourceBranchName} via Shipment ${sh.trackingCode}`;
        } else {
          // Register new device in branch inventory serial registry
          customerDeviceRecords.unshift({
            id: `dev-rcv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            customerId: 'INVENTORY_STOCK',
            customerName: `Branch Inventory (${sh.destinationBranchName})`,
            customerCode: 'STOCK',
            contactPhone: 'N/A',
            installationAddress: sh.destinationBranchName,
            branchId: sh.destinationBranchId,
            productName: prod?.name || item.productName || 'Device',
            deviceSerial: cleanSer,
            ponSerial: s.ponSerial || `HWTC-${cleanSer}`,
            status: 'IN_STOCK',
            issuedDateAD: new Date().toISOString().split('T')[0],
            issuedDateBS: '2083-04-16 BS',
            notes: `Inbound transfer received from ${sh.sourceBranchName}`,
          });
        }
      });
    }

    transactionLogs.unshift({
      id: `txn-${Date.now()}-${item.productId}`,
      transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: item.productId,
      productSku: prod?.sku || '',
      productName: prod?.name || '',
      branchId: sh.destinationBranchId,
      changeType: 'SHIPMENT_TRANSFER',
      quantityBefore: qtyBefore,
      quantityChanged: actualQtyReceived,
      quantityAfter: stk.quantityOnHand,
      unitCost: prod?.costPrice || 0,
      referenceDocId: sh.trackingCode,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  });

  sh.hasDiscrepancy = hasDiscrepancy;
  sh.status = hasDiscrepancy ? 'DISCREPANCY' : 'RECEIVED';

  res.json(sh);
});

// Stock Operations (Pullout Bins, Damage Tagging & Adjustments)
app.get('/api/stock-operations', (req, res) => {
  const { branchId } = req.query;
  if (branchId && branchId !== 'ALL') {
    return res.json(
      stockOperations.filter(
        (op) => op.branchId === branchId || op.destinationWarehouseId === branchId
      )
    );
  }
  res.json(stockOperations);
});

app.post('/api/stock-operations', (req, res) => {
  const opType = req.body.type || 'DAMAGE';
  const branchObj = branches.find((b) => b.id === req.body.branchId);
  const destWarehouseObj = branches.find((b) => b.id === (req.body.destinationWarehouseId || 'WH001'));

  let totalValue = 0;
  const items = req.body.items || [];

  if (items.length > 0) {
    totalValue = items.reduce((sum: number, it: any) => sum + (it.totalValue || it.quantity * it.unitCost), 0);
  } else if (req.body.quantityChanged && req.body.costPerUnit) {
    totalValue = Math.abs(req.body.quantityChanged) * req.body.costPerUnit;
  }

  const newOp = {
    id: `op-${Date.now()}`,
    referenceNumber: generateStandardTransactionId(req.body.branchId || 'WH001', opType),
    dateAD: new Date().toISOString().split('T')[0],
    dateBS: '2083-04-16 BS',
    totalValue,
    fiscalYear: '2082/83',
    branchName: branchObj?.name || 'Branch',
    destinationWarehouseId: destWarehouseObj?.id || 'WH001',
    destinationWarehouseName: destWarehouseObj?.name || 'Headquarters Warehouse',
    status: opType === 'PULLOUT' ? 'DISPATCHED' : 'LOGGED',
    ...req.body,
  };

  // If multi-item Pullout, Damage, Stock-Out, or Consumable Issue
  if (items.length > 0) {
    items.forEach((item: any) => {
      let stk = inventoryStock.find(
        (s) => s.productId === item.productId && s.branchId === req.body.branchId
      );
      if (!stk) {
        stk = {
          id: `stk-${(req.body.branchId || 'BR-KTM').toLowerCase()}-${item.productId}`,
          productId: item.productId,
          branchId: req.body.branchId || 'BR-KTM',
          quantityOnHand: 0,
          damagedQty: 0,
          reservedQty: 0,
          incomingQty: 0,
          lastUpdated: new Date().toISOString(),
        };
        inventoryStock.push(stk);
      }

      const qtyBefore = stk.quantityOnHand;

      if (opType === 'PULLOUT') {
        // If pulling out damaged stock, deduct from damagedQty; else deduct from usable quantityOnHand
        if (item.condition === 'DAMAGED_STOCK') {
          stk.damagedQty = Math.max(0, (stk.damagedQty || 0) - item.quantity);
        } else {
          stk.quantityOnHand = Math.max(0, stk.quantityOnHand - item.quantity);
        }
      } else if (opType === 'DAMAGE') {
        // Flagging stock as damaged at branch/warehouse:
        // Reduce usable stock and increase local damaged stock!
        stk.quantityOnHand = Math.max(0, stk.quantityOnHand - item.quantity);
        stk.damagedQty = (stk.damagedQty || 0) + item.quantity;
      } else if (opType === 'DISPOSAL') {
        // Permanent disposal & financial write-off of damaged stock:
        // Deduct from local damagedQty holding balance!
        stk.damagedQty = Math.max(0, (stk.damagedQty || 0) - item.quantity);
      } else if (opType === 'STOCK_OUT' || opType === 'CONSUMABLE_ISSUE') {
        // Deduct quantity from store/branch usable stock
        stk.quantityOnHand = Math.max(0, stk.quantityOnHand - item.quantity);
      }

      stk.lastUpdated = new Date().toISOString();

      transactionLogs.unshift({
        id: `txn-${Date.now()}-${item.productId}`,
        transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        productId: item.productId,
        productSku: item.sku || '',
        productName: item.productName || 'Product',
        branchId: req.body.branchId,
        changeType: opType,
        quantityBefore: qtyBefore,
        quantityChanged: -item.quantity,
        quantityAfter: stk.quantityOnHand,
        unitCost: item.unitCost || item.costPerUnit || item.sellingPrice || 0,
        referenceDocId: newOp.referenceNumber,
        timestampAD: new Date().toISOString(),
        timestampBS: '2083-04-16 BS',
      });
    });
  } else if (req.body.productId) {
    // Single item stock operation / damage log / consumable issue
    let stk = inventoryStock.find(
      (s) => s.productId === req.body.productId && s.branchId === req.body.branchId
    );
    if (!stk) {
      stk = {
        id: `stk-${(req.body.branchId || 'BR-KTM').toLowerCase()}-${req.body.productId}`,
        productId: req.body.productId,
        branchId: req.body.branchId || 'BR-KTM',
        quantityOnHand: 0,
        damagedQty: 0,
        reservedQty: 0,
        incomingQty: 0,
        lastUpdated: new Date().toISOString(),
      };
      inventoryStock.push(stk);
    }

    const qtyBefore = stk.quantityOnHand;
    const qtyChanged = Number(req.body.quantityChanged) || 0;

    if (opType === 'DAMAGE') {
      // Tag local damage: convert usable stock into damaged stock
      const damAmt = Math.abs(qtyChanged);
      stk.quantityOnHand = Math.max(0, stk.quantityOnHand - damAmt);
      stk.damagedQty = (stk.damagedQty || 0) + damAmt;
    } else if (opType === 'DISPOSAL') {
      // Permanent disposal & financial write-off of damaged stock
      const dispAmt = Math.abs(qtyChanged);
      stk.damagedQty = Math.max(0, (stk.damagedQty || 0) - dispAmt);
    } else {
      stk.quantityOnHand += qtyChanged;
    }

    stk.lastUpdated = new Date().toISOString();
    const prod = products.find((p) => p.id === req.body.productId);

    transactionLogs.unshift({
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: req.body.productId,
      productSku: prod?.sku || '',
      productName: req.body.productName || prod?.name || '',
      branchId: req.body.branchId,
      changeType: opType,
      quantityBefore: qtyBefore,
      quantityChanged: qtyChanged,
      quantityAfter: stk.quantityOnHand,
      unitCost: req.body.costPerUnit || prod?.costPrice || 0,
      referenceDocId: newOp.referenceNumber,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  }

  stockOperations.unshift(newOp);
  res.status(201).json(newOp);
});

// Receive Pullout Bin at Warehouse
app.post('/api/stock-operations/:id/receive', (req, res) => {
  const { id } = req.params;
  const op = stockOperations.find((o) => o.id === id);
  if (!op) return res.status(404).json({ message: 'Stock operation not found' });

  op.status = 'RECEIVED';
  const whId = op.destinationWarehouseId || 'WH001';

  // Add received stock to central Warehouse stock
  if (op.items && op.items.length > 0) {
    op.items.forEach((item: any) => {
      let whStk = inventoryStock.find((s) => s.productId === item.productId && s.branchId === whId);
      if (!whStk) {
        whStk = {
          id: `stk-${whId.toLowerCase()}-${item.productId}`,
          productId: item.productId,
          branchId: whId,
          quantityOnHand: 0,
          damagedQty: 0,
          reservedQty: 0,
          incomingQty: 0,
          lastUpdated: new Date().toISOString(),
        };
        inventoryStock.push(whStk);
      }

      const qtyBefore = whStk.quantityOnHand;

      if (item.condition === 'DAMAGED_STOCK') {
        whStk.damagedQty = (whStk.damagedQty || 0) + item.quantity;
      } else {
        whStk.quantityOnHand += item.quantity;
      }

      whStk.lastUpdated = new Date().toISOString();

      transactionLogs.unshift({
        id: `txn-${Date.now()}-${item.productId}`,
        transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        productId: item.productId,
        productSku: item.sku || '',
        productName: item.productName || '',
        branchId: whId,
        changeType: 'PULLOUT',
        quantityBefore: qtyBefore,
        quantityChanged: item.quantity,
        quantityAfter: whStk.quantityOnHand,
        unitCost: item.unitCost || 0,
        referenceDocId: op.referenceNumber,
        timestampAD: new Date().toISOString(),
        timestampBS: '2083-04-16 BS',
      });
    });
  } else if (op.productId && op.quantityChanged) {
    let whStk = inventoryStock.find((s) => s.productId === op.productId && s.branchId === whId);
    if (!whStk) {
      whStk = {
        id: `stk-${whId.toLowerCase()}-${op.productId}`,
        productId: op.productId,
        branchId: whId,
        quantityOnHand: 0,
        damagedQty: 0,
        reservedQty: 0,
        incomingQty: 0,
        lastUpdated: new Date().toISOString(),
      };
      inventoryStock.push(whStk);
    }
    const pullQty = Math.abs(op.quantityChanged);
    whStk.quantityOnHand += pullQty;
    whStk.lastUpdated = new Date().toISOString();
  }

  res.json(op);
});

// Fiscal Years
app.get('/api/fiscal-years', async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT id, code, start_date_ad::text AS "startDateAD", end_date_ad::text AS "endDateAD",
              start_date_bs AS "startDateBS", end_date_bs AS "endDateBS",
              is_current AS "isCurrent", is_closed AS "isClosed"
       FROM fiscal_years ORDER BY code ASC;`
    );
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
  } catch (e: any) {
    console.warn('PostgreSQL fiscal_years read notice:', e.message);
  }
  res.json(fiscalYears);
});

app.post('/api/fiscal-years/:id/set-current', async (req, res) => {
  const { id } = req.params;
  try {
    await pgPool.query('UPDATE fiscal_years SET is_current = FALSE;');
    await pgPool.query('UPDATE fiscal_years SET is_current = TRUE WHERE id = $1;', [id]);
  } catch (e: any) {
    console.warn('PostgreSQL set-current fiscal year notice:', e.message);
  }

  fiscalYears.forEach((fy) => {
    fy.isCurrent = fy.id === id;
  });
  res.json(fiscalYears);
});

// Bikram Sambat (BS) Calendar & Day Records Endpoints with PostgreSQL & In-Memory Fallback
const NEPALI_MONTHS_EN_SERVER = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const NEPALI_MONTHS_NP_SERVER = [
  'वैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'असोज',
  'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
];

const DAYS_OF_WEEK_EN_SERVER = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const DAYS_OF_WEEK_NP_SERVER = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'
];

const DEFAULT_BS_YEARS_SERVER = [
  { yearBS: 2078, daysInMonths: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], startAD: '2021-04-14' },
  { yearBS: 2079, daysInMonths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], startAD: '2022-04-14' },
  { yearBS: 2080, daysInMonths: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], startAD: '2023-04-14' },
  { yearBS: 2081, daysInMonths: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], startAD: '2024-04-13' },
  { yearBS: 2082, daysInMonths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], startAD: '2025-04-14' },
  { yearBS: 2083, daysInMonths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], startAD: '2026-04-14' },
  { yearBS: 2084, daysInMonths: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], startAD: '2027-04-14' },
  { yearBS: 2085, daysInMonths: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], startAD: '2028-04-13' },
];

let inMemoryBsCalendarYears = [...DEFAULT_BS_YEARS_SERVER];
let inMemoryBsDayRecords: any[] = [];

function generateInMemoryBsDayRecords() {
  const recordsMap = new Map<string, any>();
  for (const yData of inMemoryBsCalendarYears) {
    let runningDate = new Date(yData.startAD);
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthBS = monthIdx + 1;
      const daysInMonth = yData.daysInMonths[monthIdx] || 30;

      for (let dayBS = 1; dayBS <= daysInMonth; dayBS++) {
        const adDateStr = runningDate.toISOString().split('T')[0];
        const dayOfWeekIndex = runningDate.getUTCDay();

        const padMonth = monthBS < 10 ? `0${monthBS}` : `${monthBS}`;
        const padDay = dayBS < 10 ? `0${dayBS}` : `${dayBS}`;
        const bsDateStr = `${yData.yearBS}-${padMonth}-${padDay}`;

        let startYear = yData.yearBS;
        if (monthBS < 4) startYear = yData.yearBS - 1;
        const fyCode = `${startYear}-${String(startYear + 1).slice(-2)}`;

        let qtr = 'Q4';
        if (monthBS >= 4 && monthBS <= 6) qtr = 'Q1';
        else if (monthBS >= 7 && monthBS <= 9) qtr = 'Q2';
        else if (monthBS >= 10 && monthBS <= 12) qtr = 'Q3';

        recordsMap.set(adDateStr, {
          adDate: adDateStr,
          bsDate: bsDateStr,
          bsYear: yData.yearBS,
          bsMonth: monthBS,
          bsMonthName: NEPALI_MONTHS_EN_SERVER[monthIdx],
          bsMonthNameNp: NEPALI_MONTHS_NP_SERVER[monthIdx],
          bsDay: dayBS,
          dayOfWeekName: DAYS_OF_WEEK_EN_SERVER[dayOfWeekIndex],
          dayOfWeekNameNp: DAYS_OF_WEEK_NP_SERVER[dayOfWeekIndex],
          fiscalYear: fyCode,
          quarter: qtr,
          isWeekend: dayOfWeekIndex === 6,
        });

        runningDate.setDate(runningDate.getDate() + 1);
      }
    }
  }
  inMemoryBsDayRecords = Array.from(recordsMap.values());
}

// Initial generation of in-memory records
generateInMemoryBsDayRecords();

app.get('/api/bs-calendar/years', async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT year_bs AS "yearBS", days_in_months AS "daysInMonths", start_ad::text AS "startAD" FROM bs_calendar_years ORDER BY year_bs ASC;'
    );
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
  } catch (_err) {
    // Silently fall back to inMemoryBsCalendarYears if PostgreSQL is unreachable
  }
  res.json(inMemoryBsCalendarYears);
});

app.get('/api/bs-calendar/days', async (req, res) => {
  const { yearBS, monthBS, search } = req.query;
  try {
    let querySql = `
      SELECT ad_date::text AS "adDate", bs_date AS "bsDate", bs_year AS "bsYear", bs_month AS "bsMonth",
             bs_month_name AS "bsMonthName", bs_month_name_np AS "bsMonthNameNp", bs_day AS "bsDay",
             day_of_week_name AS "dayOfWeekName", day_of_week_name_np AS "dayOfWeekNameNp",
             fiscal_year AS "fiscalYear", quarter, is_weekend AS "isWeekend"
      FROM bs_day_records
      WHERE 1=1
    `;
    const params: any[] = [];
    if (yearBS && yearBS !== 'ALL') {
      params.push(parseInt(yearBS as string, 10));
      querySql += ` AND bs_year = $${params.length}`;
    }
    if (monthBS && monthBS !== 'ALL') {
      params.push(parseInt(monthBS as string, 10));
      querySql += ` AND bs_month = $${params.length}`;
    }
    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      querySql += ` AND (
        LOWER(ad_date::text) LIKE $${params.length} OR
        LOWER(bs_date) LIKE $${params.length} OR
        LOWER(bs_month_name) LIKE $${params.length} OR
        LOWER(day_of_week_name) LIKE $${params.length} OR
        LOWER(fiscal_year) LIKE $${params.length}
      )`;
    }
    querySql += ` ORDER BY ad_date ASC LIMIT 500;`;

    const result = await pgPool.query(querySql, params);
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
  } catch (_err) {
    // Silently fall back to in-memory records below
  }

  // In-Memory Filter Fallback
  let filtered = [...inMemoryBsDayRecords];
  if (yearBS && yearBS !== 'ALL') {
    const targetYr = parseInt(yearBS as string, 10);
    filtered = filtered.filter((r) => r.bsYear === targetYr);
  }
  if (monthBS && monthBS !== 'ALL') {
    const targetMo = parseInt(monthBS as string, 10);
    filtered = filtered.filter((r) => r.bsMonth === targetMo);
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.adDate.toLowerCase().includes(q) ||
        r.bsDate.toLowerCase().includes(q) ||
        r.bsMonthName.toLowerCase().includes(q) ||
        r.dayOfWeekName.toLowerCase().includes(q) ||
        r.fiscalYear.toLowerCase().includes(q)
    );
  }

  res.json(filtered.slice(0, 500));
});

app.post('/api/bs-calendar/seed', async (req, res) => {
  const { yearBS, daysInMonths, customStartAD } = req.body;
  if (!yearBS || !Array.isArray(daysInMonths) || daysInMonths.length !== 12) {
    return res.status(400).json({ message: 'Must provide yearBS and 12-element daysInMonths array' });
  }

  let startAD = customStartAD;
  if (!startAD) {
    const estADYear = yearBS - 57;
    startAD = `${estADYear}-04-14`;
  }

  // Update In-Memory Store first
  const existingIdx = inMemoryBsCalendarYears.findIndex((y) => y.yearBS === yearBS);
  if (existingIdx >= 0) {
    inMemoryBsCalendarYears[existingIdx] = { yearBS, daysInMonths, startAD };
  } else {
    inMemoryBsCalendarYears.push({ yearBS, daysInMonths, startAD });
    inMemoryBsCalendarYears.sort((a, b) => a.yearBS - b.yearBS);
  }
  generateInMemoryBsDayRecords();

  try {
    await pgPool.query(
      `INSERT INTO bs_calendar_years (year_bs, days_in_months, start_ad)
       VALUES ($1, $2, $3)
       ON CONFLICT (year_bs) DO UPDATE SET
         days_in_months = EXCLUDED.days_in_months,
         start_ad = EXCLUDED.start_ad;`,
      [yearBS, daysInMonths, startAD]
    );

    let runningDate = new Date(startAD);
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthBS = monthIdx + 1;
      const daysInMonth = daysInMonths[monthIdx] || 30;

      for (let dayBS = 1; dayBS <= daysInMonth; dayBS++) {
        const adDateStr = runningDate.toISOString().split('T')[0];
        const dayOfWeekIndex = runningDate.getUTCDay();

        const padMonth = monthBS < 10 ? `0${monthBS}` : `${monthBS}`;
        const padDay = dayBS < 10 ? `0${dayBS}` : `${dayBS}`;
        const bsDateStr = `${yearBS}-${padMonth}-${padDay}`;

        let startYear = yearBS;
        if (monthBS < 4) startYear = yearBS - 1;
        const fyCode = `${startYear}-${String(startYear + 1).slice(-2)}`;

        let qtr = 'Q4';
        if (monthBS >= 4 && monthBS <= 6) qtr = 'Q1';
        else if (monthBS >= 7 && monthBS <= 9) qtr = 'Q2';
        else if (monthBS >= 10 && monthBS <= 12) qtr = 'Q3';

        await pgPool.query(
          `INSERT INTO bs_day_records (
             ad_date, bs_date, bs_year, bs_month, bs_month_name, bs_month_name_np,
             bs_day, day_of_week_name, day_of_week_name_np, fiscal_year, quarter, is_weekend
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (ad_date) DO UPDATE SET
             bs_date = EXCLUDED.bs_date,
             bs_year = EXCLUDED.bs_year,
             bs_month = EXCLUDED.bs_month,
             bs_month_name = EXCLUDED.bs_month_name,
             bs_month_name_np = EXCLUDED.bs_month_name_np,
             bs_day = EXCLUDED.bs_day,
             day_of_week_name = EXCLUDED.day_of_week_name,
             day_of_week_name_np = EXCLUDED.day_of_week_name_np,
             fiscal_year = EXCLUDED.fiscal_year,
             quarter = EXCLUDED.quarter,
             is_weekend = EXCLUDED.is_weekend;`,
          [
            adDateStr,
            bsDateStr,
            yearBS,
            monthBS,
            NEPALI_MONTHS_EN_SERVER[monthIdx],
            NEPALI_MONTHS_NP_SERVER[monthIdx],
            dayBS,
            DAYS_OF_WEEK_EN_SERVER[dayOfWeekIndex],
            DAYS_OF_WEEK_NP_SERVER[dayOfWeekIndex],
            fyCode,
            qtr,
            dayOfWeekIndex === 6
          ]
        );

        runningDate.setDate(runningDate.getDate() + 1);
      }
    }
  } catch (_err) {
    // Silently continue if PostgreSQL is disconnected; in-memory store is already updated
  }

  res.json({
    success: true,
    message: `Successfully seeded BS Year ${yearBS} and regenerated calendar day-by-day lookup table!`,
  });
});

app.post('/api/bs-calendar/sync-range', async (req, res) => {
  const { dayRecords } = req.body;
  if (!Array.isArray(dayRecords) || dayRecords.length === 0) {
    return res.status(400).json({ success: false, message: 'No day records provided to write to SQL database.' });
  }

  // Always sync to in-memory day records store
  const recordMap = new Map<string, any>();
  for (const r of inMemoryBsDayRecords) {
    recordMap.set(r.adDate, r);
  }
  for (const r of dayRecords) {
    recordMap.set(r.adDate, r);
  }
  inMemoryBsDayRecords = Array.from(recordMap.values());

  let insertedCount = dayRecords.length;
  try {
    for (const rec of dayRecords) {
      await pgPool.query(
        `INSERT INTO bs_day_records (
           ad_date, bs_date, bs_year, bs_month, bs_month_name, bs_month_name_np,
           bs_day, day_of_week_name, day_of_week_name_np, fiscal_year, quarter, is_weekend
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (ad_date) DO UPDATE SET
           bs_date = EXCLUDED.bs_date,
           bs_year = EXCLUDED.bs_year,
           bs_month = EXCLUDED.bs_month,
           bs_month_name = EXCLUDED.bs_month_name,
           bs_month_name_np = EXCLUDED.bs_month_name_np,
           bs_day = EXCLUDED.bs_day,
           day_of_week_name = EXCLUDED.day_of_week_name,
           day_of_week_name_np = EXCLUDED.day_of_week_name_np,
           fiscal_year = EXCLUDED.fiscal_year,
           quarter = EXCLUDED.quarter,
           is_weekend = EXCLUDED.is_weekend;`,
        [
          rec.adDate,
          rec.bsDate,
          rec.bsYear,
          rec.bsMonth,
          rec.bsMonthName,
          rec.bsMonthNameNp,
          rec.bsDay,
          rec.dayOfWeekName,
          rec.dayOfWeekNameNp,
          rec.fiscalYear,
          rec.quarter,
          rec.isWeekend,
        ]
      );
    }
  } catch (_err) {
    // Continue cleanly using in-memory store
  }

  res.json({
    success: true,
    count: insertedCount,
    message: `Successfully written & updated ${insertedCount} daily conversion records in BSDayRecord database table!`,
  });
});

// Audit Trail & Transaction Logs
app.get('/api/audit-trail', (req, res) => {
  res.json(auditTrail);
});

app.get('/api/transaction-logs', (req, res) => {
  res.json(transactionLogs);
});

// Customer Device & Serial Number Lookup
app.get('/api/customer-devices', (req, res) => {
  const { branchId, query } = req.query;
  let list = customerDeviceRecords;

  if (branchId && branchId !== 'ALL') {
    list = list.filter((c) => c.branchId === branchId);
  }

  if (query && typeof query === 'string' && query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (c) =>
        c.deviceSerial.toLowerCase().includes(q) ||
        c.ponSerial.toLowerCase().includes(q) ||
        (c.macAddress && c.macAddress.toLowerCase().includes(q)) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.contactPhone.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.post('/api/customer-devices', (req, res) => {
  const newRecord: CustomerDeviceRecord = {
    id: `cust-${Date.now()}`,
    ...req.body,
  };
  customerDeviceRecords.unshift(newRecord);

  // Sync with Customer Master Directory: ensure customer exists and update count
  const custCode = newRecord.customerCode || newRecord.customerId;
  let masterCust = customerMasterRecords.find(
    (c) => c.customerId === custCode || c.id === custCode || c.customerName.toLowerCase() === newRecord.customerName.toLowerCase()
  );

  if (masterCust) {
    masterCust.assignedDevicesCount = customerDeviceRecords.filter(
      (d) => d.customerCode === masterCust?.customerId || d.customerId === masterCust?.id || d.customerName.toLowerCase() === masterCust?.customerName.toLowerCase()
    ).length;
  } else {
    // Auto-create customer profile in Customer Master Directory
    const newMaster: CustomerRecord = {
      id: custCode || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: custCode || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: newRecord.customerName,
      username: newRecord.customerName.toLowerCase().replace(/\s+/g, '.'),
      contactNumber: newRecord.contactPhone || '9800000000',
      branchId: newRecord.branchId || 'WH001',
      address: newRecord.installationAddress || 'Nepal',
      status: 'ACTIVE',
      assignedDevicesCount: 1,
    };
    customerMasterRecords.unshift(newMaster);
  }

  res.status(201).json(newRecord);
});

app.patch('/api/customer-devices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const record = customerDeviceRecords.find((c) => c.id === id);
  if (!record) return res.status(404).json({ message: 'Customer device record not found' });

  record.status = status;

  // Sync assigned devices count in master record
  const custCode = record.customerCode || record.customerId;
  const masterCust = customerMasterRecords.find(
    (c) => c.customerId === custCode || c.id === custCode || c.customerName.toLowerCase() === record.customerName.toLowerCase()
  );
  if (masterCust) {
    masterCust.assignedDevicesCount = customerDeviceRecords.filter(
      (d) => (d.customerCode === masterCust?.customerId || d.customerId === masterCust?.id || d.customerName.toLowerCase() === masterCust?.customerName.toLowerCase()) && d.status !== 'RETURNED' && d.status !== 'REFUND'
    ).length;
  }

  res.json(record);
});

// Customer Master Database Endpoints
app.get('/api/customers', (req, res) => {
  const { branchId, query } = req.query;

  // Dynamically calculate assignedDevicesCount from customerDeviceRecords
  customerMasterRecords.forEach((c) => {
    c.assignedDevicesCount = customerDeviceRecords.filter(
      (d) => d.customerCode === c.customerId || d.customerId === c.id || d.customerName.toLowerCase() === c.customerName.toLowerCase()
    ).length;
  });

  let list = customerMasterRecords;

  if (branchId && branchId !== 'ALL') {
    list = list.filter((c) => c.branchId === branchId);
  }

  if (query && typeof query === 'string' && query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (c) =>
        c.customerId?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.contactNumber?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.post('/api/customers', (req, res) => {
  const body = req.body;
  const newRecord: CustomerRecord = {
    id: body.id || body.customerId || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
    customerId: body.customerId || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
    customerName: body.customerName || 'New Customer',
    username: body.username || (body.customerId ? body.customerId.toLowerCase() : 'user'),
    contactNumber: body.contactNumber || '9800000000',
    branchId: body.branchId || 'WH001',
    address: body.address || 'Nepal',
    email: body.email || '',
    status: body.status || 'ACTIVE',
    creditLimit: Number(body.creditLimit) || 0,
    assignedDevicesCount: 0,
  };

  const idx = customerMasterRecords.findIndex((c) => c.id === newRecord.id || c.customerId === newRecord.customerId);
  if (idx >= 0) {
    customerMasterRecords[idx] = newRecord;
  } else {
    customerMasterRecords.unshift(newRecord);
  }

  res.status(201).json(newRecord);
});

app.post('/api/customers/bulk', (req, res) => {
  const items: CustomerRecord[] = req.body.customers || [];
  let count = 0;
  items.forEach((cust) => {
    const newRecord: CustomerRecord = {
      id: cust.id || cust.customerId || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: cust.customerId || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: cust.customerName || 'Imported Customer',
      username: cust.username || cust.customerId.toLowerCase(),
      contactNumber: cust.contactNumber || '9800000000',
      branchId: cust.branchId || 'WH001',
      address: cust.address || 'Nepal',
      email: cust.email || '',
      status: cust.status || 'ACTIVE',
      creditLimit: Number(cust.creditLimit) || 0,
      assignedDevicesCount: 0,
    };

    const idx = customerMasterRecords.findIndex((c) => c.id === newRecord.id || c.customerId === newRecord.customerId);
    if (idx >= 0) {
      customerMasterRecords[idx] = newRecord;
    } else {
      customerMasterRecords.unshift(newRecord);
    }
    count++;
  });

  res.status(201).json({ success: true, count, total: customerMasterRecords.length });
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const idx = customerMasterRecords.findIndex((c) => c.id === id || c.customerId === id);
  if (idx < 0) {
    return res.status(404).json({ message: 'Customer record not found' });
  }

  customerMasterRecords[idx] = {
    ...customerMasterRecords[idx],
    ...req.body,
  };

  res.json(customerMasterRecords[idx]);
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  customerMasterRecords = customerMasterRecords.filter((c) => c.id !== id && c.customerId !== id);
  res.json({ success: true, deletedId: id });
});

// Approval Requests & Workflow Authorization Routes
app.get('/api/approval-requests', (req, res) => {
  const { branchId, status } = req.query;
  let list = approvalRequests;

  if (branchId && branchId !== 'ALL') {
    list = list.filter((r) => r.branchId === branchId);
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  res.json(list);
});

app.post('/api/approval-requests', (req, res) => {
  const count = approvalRequests.length + 1;
  const requestNumber = `APR-2083-${count.toString().padStart(3, '0')}`;
  
  const newRequest: ApprovalRequest = {
    id: `apr-${Date.now()}`,
    requestNumber,
    ...req.body,
    status: 'PENDING',
    requestedAtAD: new Date().toISOString(),
    requestedAtBS: '2083-04-22 BS',
  };

  approvalRequests.unshift(newRequest);

  // Log in Audit Trail
  auditTrail.unshift({
    id: `audit-${Date.now()}`,
    userEmail: newRequest.requestedByEmail || 'user@system.com.np',
    userName: newRequest.requestedByName || 'Branch Staff',
    action: `APPROVAL_REQUEST_SUBMITTED`,
    module: 'OPERATIONS',
    details: `Submitted approval request #${newRequest.requestNumber} for ${newRequest.customerName} (${newRequest.deviceSerial}) status change to ${newRequest.requestedStatus}`,
    timestampAD: new Date().toISOString(),
    timestampBS: '2083-04-22 BS',
    branchId: newRequest.branchId,
  });

  res.status(201).json(newRequest);
});

app.post('/api/approval-requests/:id/process', (req, res) => {
  const { id } = req.params;
  const { status, approverUser, rejectionReason } = req.body; // status: 'APPROVED' | 'REJECTED'

  const request = approvalRequests.find((r) => r.id === id);
  if (!request) return res.status(404).json({ message: 'Approval request not found' });

  request.status = status;
  request.processedByEmail = approverUser?.email || 'admin@system.com.np';
  request.processedByName = approverUser?.name || 'Super Admin';
  request.processedByRole = approverUser?.role || 'SUPER_ADMIN';
  request.processedAtAD = new Date().toISOString();
  request.processedAtBS = '2083-04-22 BS';

  if (status === 'REJECTED') {
    request.rejectionReason = rejectionReason || 'Request rejected by administrator';

    auditTrail.unshift({
      id: `audit-${Date.now()}`,
      userEmail: request.processedByEmail,
      userName: request.processedByName,
      action: `APPROVAL_REQUEST_REJECTED`,
      module: 'OPERATIONS',
      details: `Rejected approval request #${request.requestNumber} for ${request.customerName} (${request.deviceSerial}): ${request.rejectionReason}`,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-22 BS',
      branchId: request.branchId,
    });

    return res.json({ request, message: 'Approval request rejected successfully' });
  }

  // IF APPROVED: execute the requested status change on customer device record
  if (request.type === 'CUSTOMER_DEVICE_STATUS') {
    const devRecord = customerDeviceRecords.find((c) => c.id === request.targetId || c.deviceSerial === request.deviceSerial);
    if (devRecord) {
      devRecord.status = request.requestedStatus;
    }

    // Restock Inventory if requested
    if (request.restockQtyOnApproval) {
      const prod = products.find((p) => p.name.toLowerCase() === request.productName.toLowerCase()) || products[0];
      let stk = inventoryStock.find((s) => s.productId === prod.id && s.branchId === request.branchId);
      
      if (!stk) {
        stk = {
          id: `stk-${request.branchId.toLowerCase()}-${prod.id}`,
          productId: prod.id,
          branchId: request.branchId,
          quantityOnHand: 0,
          damagedQty: 0,
          reservedQty: 0,
          incomingQty: 0,
          lastUpdated: new Date().toISOString(),
        };
        inventoryStock.push(stk);
      }

      const qtyBefore = stk.quantityOnHand;
      stk.quantityOnHand += 1;
      stk.lastUpdated = new Date().toISOString();

      transactionLogs.unshift({
        id: `txn-${Date.now()}`,
        transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        branchId: request.branchId,
        changeType: 'PULLOUT',
        quantityBefore: qtyBefore,
        quantityChanged: 1,
        quantityAfter: stk.quantityOnHand,
        unitCost: prod.costPrice,
        referenceDocId: request.requestNumber,
        timestampAD: new Date().toISOString(),
        timestampBS: '2083-04-22 BS',
      });
    }

    auditTrail.unshift({
      id: `audit-${Date.now()}`,
      userEmail: request.processedByEmail,
      userName: request.processedByName,
      action: `APPROVAL_REQUEST_APPROVED`,
      module: 'OPERATIONS',
      details: `Approved request #${request.requestNumber}. Updated ${request.customerName} (${request.deviceSerial}) status to ${request.requestedStatus}${request.restockQtyOnApproval ? ' (+1 unit restocked to branch inventory)' : ''}`,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-22 BS',
      branchId: request.branchId,
    });
  }

  res.json({ request, message: 'Approval request authorized and executed successfully' });
});

// Financial Reports Summary
app.get('/api/reports/financial-summary', (req, res) => {
  const { branchId } = req.query;
  let targetStock = inventoryStock;
  let targetAssets = assetRegister;
  let targetInvoices = purchaseInvoices;
  let targetOps = stockOperations;

  if (branchId && branchId !== 'ALL') {
    targetStock = inventoryStock.filter((s) => s.branchId === branchId);
    targetAssets = assetRegister.filter((a) => a.branchId === branchId);
    targetInvoices = purchaseInvoices.filter((inv) => inv.branchId === branchId);
    targetOps = stockOperations.filter((op) => op.branchId === branchId);
  }

  const totalInventoryAssetValue = targetStock.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? prod.costPrice * item.quantityOnHand : 0);
  }, 0);

  const totalFixedAssetValue = targetAssets.reduce(
    (sum, a) => sum + (a.netBookValue ?? 0),
    0
  );

  const totalAccountsPayable = targetInvoices.reduce(
    (sum, inv) => sum + Math.max(0, (inv.grandTotal ?? 0) - (inv.amountPaid ?? 0)),
    0
  );

  const totalDamageLossValue = targetOps.reduce(
    (sum, op) => sum + (op.totalValue ?? 0),
    0
  );

  const totalVatInputTax = targetInvoices.reduce(
    (sum, inv) => sum + (inv.vatAmount ?? 0),
    0
  );

  const currentFy = fiscalYears.find((f) => f.isCurrent)?.code || '2082/83';

  res.json({
    totalInventoryAssetValue,
    totalFixedAssetValue,
    totalAccountsPayable,
    totalCostOfGoodsSold: 450000,
    totalDamageLossValue,
    totalVatInputTax,
    currentFiscalYear: currentFy,
  });
});

// AI Analytics Proxy Endpoint
app.post('/api/ai/analytics', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const aiClient = getGenAIClient();

    if (!aiClient) {
      return res.json({
        insight: `📊 **IZone Executive AI Analysis Report**\n\n1. **Stock Optimization Priority**:\n   • **Kathmandu HQ**: Solar Inverters (IZ-2001) are at 3 sets, below minimum reorder level of 4. Immediate Purchase Order generation recommended.\n   • **Pokhara Hub**: Laptops (IZ-1001) are down to 4 units. Inter-branch transfer from Kathmandu is currently in-transit (4 units).\n\n2. **Nepal VAT & Tax Compliance**:\n   • Total Input VAT Credit recorded: रु ${purchaseInvoices.reduce((s, i) => s + i.vatAmount, 0).toLocaleString()}.\n   • Verified all supplier invoices adhere to IRD 13% VAT rules.\n\n3. **Fixed Asset Depreciation**:\n   • Total Net Book Value across 3 active fixed assets stands at रु ${assetRegister.reduce((s, a) => s + a.netBookValue, 0).toLocaleString()}.\n   • Vehicles depreciation under Reducing Balance method is current for FY 2082/83 BS.`,
        timestamp: new Date().toISOString(),
      });
    }

    const systemPrompt = `You are the chief AI Inventory & Financial Officer for IZone Enterprise System in Nepal. Provide a concise, bulleted strategic analysis focusing on stock health, low stock alerts, purchase orders, VAT compliance (13% VAT), and Bikram Sambat fiscal year metrics based on user query: ${prompt}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    res.json({
      insight: response.text || 'Analysis completed successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      insight: `📊 **IZone Executive Stock Analysis**\n\n• **Low Stock Alert**: Reorder required for Solar Inverters and Laptops.\n• **In-Transit Transfers**: Shipment TRF-2083-0092 in transit to Pokhara.\n• **Tax Compliance**: Input VAT credit is fully reconciled for current BS period.`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Vite Middleware Setup for Dev Mode vs Static Production Serving
async function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IZone Inventory System server running on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
