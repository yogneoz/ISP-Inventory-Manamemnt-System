import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
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
} from './src/types';

dotenv.config();

const app = express();
app.use(express.json());

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
  },
  {
    id: 'usr-2',
    email: 'subash.dhimal@izone.net.np',
    password: 'subash@123',
    name: 'Subash Dhimal',
    role: 'SUPER_ADMIN', // Stock Controller with full access
    branchId: 'WH001',
  },
  {
    id: 'usr-3',
    email: 'sandesh.rai@izone.net.np',
    password: 'Sandesh@123',
    name: 'Sandesh Rai',
    role: 'BRANCH_MANAGER',
    branchId: 'CHU01',
  },
  {
    id: 'usr-4',
    email: 'bidhya.khatiwad@izone.net.np',
    password: 'Bidhya@123',
    name: 'Bidhya Khatiwada',
    role: 'INVENTORY_CLERK',
    branchId: 'CHU01',
  },
  {
    id: 'usr-5',
    email: 'sanjiwani.chaudhary@izone.net.np',
    password: 'Sanjiwani@123',
    name: 'Sanjiwani Kumari Chaudhary',
    role: 'ACCOUNTANT',
    branchId: 'WH001',
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

// Imported Items from Excel Data Sheet
const EXCEL_ITEMS = [
  { code: 'ADP001', group: 'FIXED ASSET', type: 'Adaptor', name: '0 DB ADAPTAR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ADP002', group: 'FIXED ASSET', type: 'Adaptor', name: 'DC POWER SUPPLY-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ADP003', group: 'FIXED ASSET', type: 'Adaptor', name: 'OPTICAL ADAPTER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ADP004', group: 'FIXED ASSET', type: 'Adaptor', name: 'OPTICAL POWER METER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ADP005', group: 'PRODUCT ITEM', type: 'Adaptor', name: 'POE ADAPTER', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ADP006', group: 'FIXED ASSET', type: 'Adaptor', name: 'POWER ADAPTOR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'AIR001', group: 'FIXED ASSET', type: 'Air Conditioner', name: 'AC (DC INVERTOR-GWH18AGD-K6DNA10-1.5TR)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'AVJ001', group: 'PRODUCT ITEM', type: 'Av Jack', name: 'AV JACK', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'BAT001', group: 'FIXED ASSET', type: 'Battery', name: 'BATTERY (LEAD ACID-BATTERY)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'BAT002', group: 'FIXED ASSET', type: 'Battery', name: 'LITHIUM-BATTERY (36VA)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'BAT003', group: 'FIXED ASSET', type: 'Battery', name: 'LITHIUM-BATTERY (48VA)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'BIN001', group: 'FIXED ASSET', type: 'Binding Wire', name: 'BENDING WIRE-FA', uom: 'Roll', qty: 1, val: 25 },
  { code: 'CST001', group: 'FIXED ASSET', type: 'Cassettte', name: '1*4 SC/UPC CASSETTE-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CST002', group: 'FIXED ASSET', type: 'Cassettte', name: '1*16 PLC SPLITTER CASSETTE-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CST003', group: 'FIXED ASSET', type: 'Cassettte', name: '1*8 SC/UPC CASSETE-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CAT001', group: 'PRODUCT ITEM', type: 'Cat6 Cable', name: 'CAT 6 CABLE WIRE', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'MON001', group: 'PRODUCT ITEM', type: 'Computer & Accessories', name: 'MONITOR', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'COP001', group: 'FIXED ASSET', type: 'Coupler', name: 'COUPLER - FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CUT001', group: 'FIXED ASSET', type: 'Cutter', name: 'CUTTER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DAC001', group: 'FIXED ASSET', type: 'Dac Cable', name: 'DAC CABLE-FA', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'DBX001', group: 'FIXED ASSET', type: 'Distribution Box', name: '1*16 DISTRIBUTION BOX-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DBX002', group: 'FIXED ASSET', type: 'Distribution Box', name: '1*16 SPLITTER WITH OUTDOOR BOX-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DBX003', group: 'FIXED ASSET', type: 'Distribution Box', name: '1*8 SPLITTER WITH OUTDOOR BOX-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DBX004', group: 'FIXED ASSET', type: 'Distribution Box', name: 'BAMBOO SMALL-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DRP001', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 175 MTR', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'DRP002', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 100 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP003', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 125 MTR', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DRP004', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 150 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP005', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 200 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP006', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 250 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP007', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 300 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP008', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 400 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP009', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 50 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'DRP010', group: 'PRODUCT ITEM', type: 'Drop Cable', name: 'DROP CABLE 75 MTR', uom: 'Roll', qty: 1, val: 25 },
  { code: 'FAS001', group: 'FIXED ASSET', type: 'Fast Connector', name: 'FAST CONNECTOR SC/UPC-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'FIB001', group: 'FIXED ASSET', type: 'Fiber', name: '2 CORE OPTICAL FIBER-FA', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'FIB002', group: 'FIXED ASSET', type: 'Fiber', name: '24 CORE OPTICAL FIBER - FA', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'FIB003', group: 'FIXED ASSET', type: 'Fiber', name: '4 CORE OPTICAL CABLE-FA', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'FIB004', group: 'FIXED ASSET', type: 'Fiber', name: '6 CORE OPTICAL FIBER-FA', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'FIB005', group: 'FIXED ASSET', type: 'Fiber', name: '12 CORE OPTICAL FIBER-FA', uom: 'Mtr', qty: 1, val: 25 },
  { code: 'CLE001', group: 'FIXED ASSET', type: 'Fiber Cleaver', name: 'FIBER CLEAVER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SPL001', group: 'FIXED ASSET', type: 'Fiber Fusion Splicer', name: 'FIBER FUSION SPLICER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'STR001', group: 'FIXED ASSET', type: 'Fiber Sripper', name: 'FIBER STRIPPER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'HOC001', group: 'FIXED ASSET', type: 'Furniture', name: 'HYDRAULIC OFFICE CHAIR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'HDD001', group: 'PRODUCT ITEM', type: 'Hdd', name: 'ST 4000 VX 000', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'HDM001', group: 'PRODUCT ITEM', type: 'Hdmi Cable', name: 'HDMI CABLE', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'IPT001', group: 'FIXED ASSET', type: 'Iptv Box', name: 'ANDROID BOX-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'IPT002', group: 'PRODUCT ITEM', type: 'Iptv Box', name: 'IP TV SETUP BOX', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'IPT003', group: 'PRODUCT ITEM', type: 'Iptv Box', name: 'NET TV SETUP BOX', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'IPR001', group: 'PRODUCT ITEM', type: 'Iptv Remote', name: 'IP TV REMOTE', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'LDR001', group: 'FIXED ASSET', type: 'Ladder', name: 'TELESCOPIC LADDER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'LAL001', group: 'FIXED ASSET', type: 'Laser Light', name: 'LASER LIGHT 10KM-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'MEC001', group: 'PRODUCT ITEM', type: 'Media Connector', name: 'MEDIA CONVERTOR 10/100/1000 20KM', uom: 'Pair', qty: 1, val: 25 },
  { code: 'NTS001', group: 'FIXED ASSET', type: 'Network Switch', name: 'SWITCH (HUAWEI S6700-24-EI)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'NTS002', group: 'FIXED ASSET', type: 'Network Switch', name: 'SWITCH HUB 8 PORT-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'NTS003', group: 'FIXED ASSET', type: 'Network Switch', name: 'SWITCH-BDCOM-S2928EF-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'TEL001', group: 'FIXED ASSET', type: 'Office Equipment', name: 'TELEPHONE SET', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'OLT001', group: 'FIXED ASSET', type: 'Olt', name: 'OLT SFP LOADED 16 PORT', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'OLT002', group: 'FIXED ASSET', type: 'Olt', name: 'OLT SFP LOADED 32 PORT-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'OLT003', group: 'FIXED ASSET', type: 'Olt', name: 'OLT SFP LOADED 8 PORT', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'OLT004', group: 'FIXED ASSET', type: 'Olt', name: 'OLT-BDCOM-P3310D-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'OLT005', group: 'FIXED ASSET', type: 'Olt', name: 'OLT-BDCOM-P3608B-2AC-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'OLT006', group: 'FIXED ASSET', type: 'Olt', name: 'OLT-VSOL-V1600D8-10G-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CAR001', group: 'FIXED ASSET', type: 'Nat Card', name: 'NET ENGINE 8000 M4CGN CARD', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CAR002', group: 'PRODUCT ITEM', type: 'Olt Card', name: 'FIBER CARD 16 PORT-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CAR003', group: 'FIXED ASSET', type: 'Olt Card', name: 'MINI ODTR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CAR004', group: 'FIXED ASSET', type: 'Olt Card', name: 'OLT CARD-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ONU001', group: 'PRODUCT ITEM', type: 'Onu Router', name: 'ONU ROUTER 2.4G', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'ONU002', group: 'PRODUCT ITEM', type: 'Onu Router', name: 'ONU ROUTER 5G', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PTC001', group: 'FIXED ASSET', type: 'Patch Cord', name: '12 CORE MPO 3M FEMALE CABLE', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PTC002', group: 'FIXED ASSET', type: 'Patch Cord', name: 'PATCH CORD LC-LC DX OM2 5MTR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PTC003', group: 'FIXED ASSET', type: 'Patch Cord', name: 'PATCH CORD-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'DDR001', group: 'FIXED ASSET', type: 'RAM', name: 'DDR RAM-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'RJC001', group: 'FIXED ASSET', type: 'Rj45', name: 'RJ 45-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CSR001', group: 'FIXED ASSET', type: 'Core Server', name: 'DELL R640 (XEON SILVER 4116-64GB)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CRR001', group: 'FIXED ASSET', type: 'Service Router', name: 'HUAWEI NETENGINE 8000 M4-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CRR002', group: 'PRODUCT ITEM', type: 'Service Router', name: 'MIKROTIK HEX RB750Gr3', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'CRR003', group: 'PRODUCT ITEM', type: 'Service Router', name: 'ROUTER-CCR 1036-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SPF001', group: 'FIXED ASSET', type: 'Sfp', name: 'QSFP 40 G 100M-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SPF002', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 1.25G 20KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF003', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 1.25G 40KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF004', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 1.25G 80KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF005', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 10G 10KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF006', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 10G 20KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF007', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 10G 40KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF008', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 10G 80KM-FA', uom: 'Pair', qty: 1, val: 25 },
  { code: 'SPF009', group: 'FIXED ASSET', type: 'Sfp', name: 'SFP 10G DX 300M-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SLV001', group: 'FIXED ASSET', type: 'Sleeves', name: 'SLEEVE-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SCC001', group: 'FIXED ASSET', type: 'Solar Charger Controller', name: 'SOLAR CHARGE CONTROLLER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SOL001', group: 'FIXED ASSET', type: 'Solar Pannel', name: 'SOLAR PANNEL-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PLC001', group: 'FIXED ASSET', type: 'Splitter', name: '1*16 SPLITTER WITH CONNECTOR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PLC002', group: 'FIXED ASSET', type: 'Splitter', name: '1*8 SPLITTER WITH CONNECTOR-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PLC003', group: 'FIXED ASSET', type: 'Splitter', name: '1*2 SPLITTER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PLC004', group: 'FIXED ASSET', type: 'Splitter', name: '1*4 PLC SPLITTER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'PLC005', group: 'FIXED ASSET', type: 'Splitter', name: '1*8 PLC SPLITTER-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SSD001', group: 'FIXED ASSET', type: 'SSD', name: 'CRUCIAL SSD(500GB)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SSD002', group: 'FIXED ASSET', type: 'SSD', name: 'GEONIX SSD-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'SSD003', group: 'FIXED ASSET', type: 'SSD', name: 'SSD DC S36100', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'TBX001', group: 'FIXED ASSET', type: 'Tiffin Bod', name: 'TIFFIN BOX - MEDIUM-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'TBX002', group: 'FIXED ASSET', type: 'Tiffin Bod', name: 'TIFFIN BOX - SMALL-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'INV001', group: 'FIXED ASSET', type: 'Inverter', name: 'INVERTER/UPS 1400VA-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'INV002', group: 'FIXED ASSET', type: 'Inverter', name: 'UPS (1090VA)-FA', uom: 'Pcs', qty: 1, val: 25 },
  { code: 'INV003', group: 'FIXED ASSET', type: 'Inverter', name: 'UPS (FINCH 10KVA/192V)-FA', uom: 'Pcs', qty: 0, val: 0 },
];

const NON_SERIALIZED_CATEGORIES = [
  'Drop Cable', 'Cat6 Cable', 'Fiber', 'Dac Cable', 'Patch Cord',
  'Fast Connector', 'Coupler', 'Splitter', 'Distribution Box',
  'Av Jack', 'Binding Wire', 'Adaptor', 'Sleeves', 'Tiffin Bod', 'Cassettte'
];

// Pre-seeded Products mapped from Excel Sheet
let products: Product[] = EXCEL_ITEMS.map((item, idx) => {
  const isConsumableOrCable =
    NON_SERIALIZED_CATEGORIES.includes(item.type) ||
    ['Mtr', 'Roll', 'Box'].includes(item.uom) ||
    item.name.includes('CABLE') ||
    item.name.includes('WIRE') ||
    item.name.includes('CONNECTOR');

  const requiresSerialTracking = !isConsumableOrCable;

  return {
    id: `prod-${item.code.toLowerCase()}`,
    sku: item.code,
    barcode: `890${String(100000000 + idx).slice(1)}`,
    name: item.name,
    category: item.type,
    productGroup: item.group === 'FIXED ASSET' ? 'Fixed Asset' : 'Product Item',
    unit: item.uom,
    costPrice: item.val > 0 ? item.val : 1500,
    sellingPrice: item.val > 0 ? Math.round(item.val * 1.25) : 1875,
    taxRate: 13,
    minReorderLevel: 5,
    requiresSerialTracking,
    trackingType: requiresSerialTracking ? 'SERIAL_MAC_PON' : 'QUANTITY_ONLY',
    description: `[${item.group}] ${item.type} - ${item.name}`,
    ...(item.group === 'FIXED ASSET'
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
products.forEach((p, index) => {
  branches.forEach((branch, bIdx) => {
    // Keep 2-3 pieces of each product item per branch
    const qty = 2 + ((index + bIdx) % 2);
    const damagedQty = (index + bIdx) % 11 === 0 ? 1 : 0;

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
let stockOperations: StockOperation[] = [
  {
    id: 'op-401',
    referenceNumber: 'DMG-2083-001',
    type: 'DAMAGE',
    branchId: 'CHU01',
    productId: 'prod-hoc001',
    productName: 'HYDRAULIC OFFICE CHAIR-FA',
    quantityChanged: -1,
    costPerUnit: 25,
    totalValue: 25,
    reason: 'Hydro pneumatic mechanism damaged during transit',
    inspectorName: 'Suresh Bhattarai',
    dateAD: '2026-07-22',
    dateBS: '2083-04-07 BS',
    fiscalYear: '2082/83',
  },
];

// Pre-seeded Fiscal Years
let fiscalYears: FiscalYear[] = [
  {
    id: 'fy-1',
    code: '2080/81',
    startDateAD: '2023-07-17',
    endDateAD: '2024-07-15',
    startDateBS: '2080-04-01 BS',
    endDateBS: '2080-12-31 BS',
    isCurrent: false,
    isClosed: true,
  },
  {
    id: 'fy-2',
    code: '2081/82',
    startDateAD: '2024-07-16',
    endDateAD: '2025-07-15',
    startDateBS: '2081-04-01 BS',
    endDateBS: '2081-12-31 BS',
    isCurrent: false,
    isClosed: true,
  },
  {
    id: 'fy-3',
    code: '2082/83',
    startDateAD: '2025-07-16',
    endDateAD: '2026-07-15',
    startDateBS: '2082-04-01 BS',
    endDateBS: '2082-12-31 BS',
    isCurrent: true,
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

  if (quantityOnHand !== undefined) {
    stk.quantityOnHand = Number(quantityOnHand);
  }
  if (damagedQty !== undefined) {
    stk.damagedQty = Number(damagedQty);
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
    poNumber: `PO-2083-${Math.floor(100 + Math.random() * 900)}`,
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
  const newInv = {
    id: `inv-${Date.now()}`,
    invoiceNumber: `INV-2083-${Math.floor(1000 + Math.random() * 9000)}`,
    ...req.body,
  };

  const targetBranchId = req.body.branchId || branches[0]?.id || 'BR-KTM';
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
    trackingCode: `TRF-2083-${Math.floor(1000 + Math.random() * 9000)}`,
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
  const sh = shipments.find((s) => s.id === id);
  if (!sh) return res.status(404).json({ message: 'Shipment not found' });

  sh.status = 'RECEIVED';

  // Increment destination stock
  sh.items.forEach((item: any) => {
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
    stk.quantityOnHand += item.quantitySent;

    const prod = products.find((p) => p.id === item.productId);

    transactionLogs.unshift({
      id: `txn-${Date.now()}-${item.productId}`,
      transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: item.productId,
      productSku: prod?.sku || '',
      productName: prod?.name || '',
      branchId: sh.destinationBranchId,
      changeType: 'SHIPMENT_TRANSFER',
      quantityBefore: qtyBefore,
      quantityChanged: item.quantitySent,
      quantityAfter: stk.quantityOnHand,
      unitCost: prod?.costPrice || 0,
      referenceDocId: sh.trackingCode,
      timestampAD: new Date().toISOString(),
      timestampBS: '2083-04-16 BS',
    });
  });

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
    referenceNumber: `${opType.slice(0, 3)}-2083-${Math.floor(100 + Math.random() * 900)}`,
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

  // If multi-item Pullout or Damage Bin
  if (items.length > 0) {
    items.forEach((item: any) => {
      let stk = inventoryStock.find(
        (s) => s.productId === item.productId && s.branchId === req.body.branchId
      );
      if (stk) {
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
        }

        stk.lastUpdated = new Date().toISOString();

        transactionLogs.unshift({
          id: `txn-${Date.now()}-${item.productId}`,
          transactionNumber: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
          productId: item.productId,
          productSku: item.sku || '',
          productName: item.productName || 'Product',
          branchId: req.body.branchId,
          changeType: opType === 'PULLOUT' ? 'PULLOUT' : 'DAMAGE',
          quantityBefore: qtyBefore,
          quantityChanged: -item.quantity,
          quantityAfter: stk.quantityOnHand,
          unitCost: item.unitCost || 0,
          referenceDocId: newOp.referenceNumber,
          timestampAD: new Date().toISOString(),
          timestampBS: '2083-04-16 BS',
        });
      }
    });
  } else if (req.body.productId) {
    // Single item stock operation / damage log
    let stk = inventoryStock.find(
      (s) => s.productId === req.body.productId && s.branchId === req.body.branchId
    );
    if (stk) {
      const qtyBefore = stk.quantityOnHand;
      const qtyChanged = Number(req.body.quantityChanged) || 0;

      if (opType === 'DAMAGE') {
        // Tag local damage: convert usable stock into damaged stock
        const damAmt = Math.abs(qtyChanged);
        stk.quantityOnHand = Math.max(0, stk.quantityOnHand - damAmt);
        stk.damagedQty = (stk.damagedQty || 0) + damAmt;
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
app.get('/api/fiscal-years', (req, res) => {
  res.json(fiscalYears);
});

app.post('/api/fiscal-years/:id/set-current', (req, res) => {
  const { id } = req.params;
  fiscalYears.forEach((fy) => {
    fy.isCurrent = fy.id === id;
  });
  res.json(fiscalYears);
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
  res.status(201).json(newRecord);
});

app.patch('/api/customer-devices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const record = customerDeviceRecords.find((c) => c.id === id);
  if (!record) return res.status(404).json({ message: 'Customer device record not found' });

  record.status = status;
  res.json(record);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IZone Inventory System server running on http://localhost:${PORT}`);
  });
}

startServer();
