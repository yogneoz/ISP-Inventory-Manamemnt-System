export type UserRole = 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'INVENTORY_CLERK' | 'ACCOUNTANT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string;
  avatarUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  panVatNumber: string;
  rating: number;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  phone: string;
  isHeadquarters: boolean;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: 'Pcs' | 'Box' | 'Kg' | 'Set' | 'Mtr' | 'Roll' | 'Pair' | string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number; // e.g., 13 for 13% VAT
  minReorderLevel: number;
  description?: string;
  imageUrl?: string;
}

export interface InventoryStock {
  id: string;
  productId: string;
  branchId: string;
  quantityOnHand: number;
  reservedQty: number;
  incomingQty: number;
  lastUpdated: string;
}

export interface Asset {
  id: string;
  tagNumber: string;
  name: string;
  category: 'IT Equipment' | 'Furniture' | 'Machinery' | 'Vehicles' | 'Fixtures';
  branchId: string;
  acquisitionDateAD: string;
  acquisitionDateBS: string;
  acquisitionCost: number;
  depreciationMethod: 'STRAIGHT_LINE' | 'REDUCING_BALANCE';
  depreciationRatePercent: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED';
  disposalDateAD?: string;
}

export interface POLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  isTaxExempt?: boolean;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  branchId: string;
  orderDateAD: string;
  orderDateBS: string;
  expectedDeliveryDateAD: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  items: POLineItem[];
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export interface DeviceSerialPair {
  deviceSerial: string;
  ponSerial?: string;
  macAddress?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Discount amount
  isTaxExempt: boolean;
  taxRate: number; // 13 or 0
  subtotal: number;
  taxAmount: number;
  total: number;
  deviceSerials?: DeviceSerialPair[];
}

export interface CustomerDeviceRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  contactPhone: string;
  installationAddress: string;
  branchId: string;
  productName: string;
  deviceSerial: string;
  ponSerial: string;
  macAddress?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISCONNECTED' | 'IN_STOCK' | 'RETURNED';
  issuedDateAD: string;
  issuedDateBS: string;
  purchaseBillRef?: string;
  notes?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  vendorBillNumber?: string;
  poReferenceId?: string;
  supplierName: string;
  branchId: string;
  invoiceDateAD: string;
  invoiceDateBS: string;
  dueDateAD: string;
  dueDateBS: string;
  paymentMethod?: 'CASH' | 'CREDIT' | 'BANK_TRANSFER' | 'CHEQUE';
  items?: PurchaseInvoiceItem[];
  subtotalAmount?: number;
  totalDiscount?: number;
  taxableAmount: number;
  vatAmount: number; // 13% VAT
  nonTaxableAmount: number;
  grandTotal: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  amountPaid: number;
  notes?: string;
}

export interface ShipmentItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantitySent: number;
  quantityReceived?: number;
}

export interface Shipment {
  id: string;
  trackingCode: string;
  type: 'INTER_BRANCH' | 'SUPPLIER_INBOUND';
  sourceBranchId?: string;
  sourceBranchName?: string;
  destinationBranchId: string;
  destinationBranchName: string;
  dispatchDateAD: string;
  dispatchDateBS: string;
  estimatedArrivalAD: string;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RECEIVED' | 'DISCREPANCY';
  items: ShipmentItem[];
  notes?: string;
}

export interface StockOperation {
  id: string;
  referenceNumber: string;
  type: 'PULLOUT' | 'DAMAGE' | 'STOCK_OUT' | 'MANUAL_ADJUSTMENT';
  branchId: string;
  productId: string;
  productName: string;
  quantityChanged: number; // e.g. -5 or +10
  costPerUnit: number;
  totalValue: number;
  reason: string;
  inspectorName: string;
  dateAD: string;
  dateBS: string;
  fiscalYear: string;
}

export interface FiscalYear {
  id: string;
  code: string; // e.g. "2080/81", "2081/82", "2082/83"
  startDateAD: string;
  endDateAD: string;
  startDateBS: string;
  endDateBS: string;
  isCurrent: boolean;
  isClosed: boolean;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  module: 'AUTH' | 'PRODUCTS' | 'STOCK' | 'ASSETS' | 'PURCHASE_ORDERS' | 'INVOICES' | 'SHIPMENTS' | 'OPERATIONS' | 'FISCAL_YEAR';
  details: string;
  timestampAD: string;
  timestampBS: string;
  branchId?: string;
}

export interface TransactionLog {
  id: string;
  transactionNumber: string;
  productId: string;
  productSku: string;
  productName: string;
  branchId: string;
  changeType: 'INBOUND_PO' | 'SHIPMENT_TRANSFER' | 'PULLOUT' | 'DAMAGE' | 'STOCK_OUT' | 'MANUAL_ADJUSTMENT';
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  unitCost: number;
  referenceDocId?: string;
  timestampAD: string;
  timestampBS: string;
}

export interface FinancialSummary {
  totalInventoryAssetValue: number;
  totalFixedAssetValue: number;
  totalAccountsPayable: number;
  totalCostOfGoodsSold: number;
  totalDamageLossValue: number;
  totalVatInputTax: number;
  currentFiscalYear: string;
}

export interface SystemState {
  currentUser: User | null;
  selectedBranchId: string; // 'ALL' or branch.id
  dateDisplayMode: 'BS' | 'AD';
}
