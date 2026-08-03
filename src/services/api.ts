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
  FinancialSummary,
  CustomerDeviceRecord,
} from '../types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getCurrentUser(): Promise<User> {
    return fetchJson('/api/auth/me');
  },

  // Branches
  async getBranches(): Promise<Branch[]> {
    return fetchJson('/api/branches');
  },

  async createBranch(branch: Omit<Branch, 'id'>): Promise<Branch> {
    return fetchJson('/api/branches', {
      method: 'POST',
      body: JSON.stringify(branch),
    });
  },

  async updateBranch(id: string, branch: Partial<Branch>): Promise<Branch> {
    return fetchJson(`/api/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branch),
    });
  },

  async deleteBranch(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/branches/${id}`, {
      method: 'DELETE',
    });
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return fetchJson('/api/suppliers');
  },

  async createSupplier(supplier: Omit<Supplier, 'id' | 'rating'>): Promise<Supplier> {
    return fetchJson('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
  },

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    return fetchJson(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    });
  },

  async deleteSupplier(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/suppliers/${id}`, {
      method: 'DELETE',
    });
  },

  // Users
  async getUsers(): Promise<User[]> {
    return fetchJson('/api/users');
  },

  async createUser(user: Omit<User, 'id'> & { password?: string }): Promise<User> {
    return fetchJson('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    return fetchJson(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Products
  async getProducts(): Promise<Product[]> {
    return fetchJson('/api/products');
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    return fetchJson('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return fetchJson(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Stock
  async getStock(branchId?: string): Promise<InventoryStock[]> {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    return fetchJson(`/api/stock${query}`);
  },

  async updateStockLevel(stockId: string, quantityOnHand: number, reason: string): Promise<InventoryStock> {
    return fetchJson(`/api/stock/${stockId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantityOnHand, reason }),
    });
  },

  async updateStockReorderLevel(stockId: string, minReorderLevel: number): Promise<InventoryStock> {
    return fetchJson(`/api/stock/${stockId}/reorder-level`, {
      method: 'PATCH',
      body: JSON.stringify({ minReorderLevel }),
    });
  },

  async bulkUpdateStockReorderLevels(updates: { stockId: string; minReorderLevel: number }[]): Promise<{ success: boolean; count: number }> {
    return fetchJson('/api/stock/bulk-reorder-levels', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  },

  // Assets
  async getAssets(branchId?: string): Promise<Asset[]> {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    return fetchJson(`/api/assets${query}`);
  },

  async createAsset(asset: Omit<Asset, 'id' | 'netBookValue' | 'accumulatedDepreciation'>): Promise<Asset> {
    return fetchJson('/api/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  },

  async updateAssetStatus(id: string, status: Asset['status']): Promise<Asset> {
    return fetchJson(`/api/assets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Purchase Orders
  async getPurchaseOrders(branchId?: string): Promise<PurchaseOrder[]> {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    return fetchJson(`/api/purchase-orders${query}`);
  },

  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'subtotalAmount' | 'taxAmount' | 'totalAmount'>): Promise<PurchaseOrder> {
    return fetchJson('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(po),
    });
  },

  async updatePurchaseOrderStatus(id: string, status: string): Promise<PurchaseOrder> {
    return fetchJson(`/api/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
    return fetchJson(`/api/purchase-orders/${id}/receive`, {
      method: 'POST',
    });
  },

  // Purchase Invoices
  async getPurchaseInvoices(branchId?: string): Promise<PurchaseInvoice[]> {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    return fetchJson(`/api/purchase-invoices${query}`);
  },

  async createPurchaseInvoice(inv: Omit<PurchaseInvoice, 'id' | 'invoiceNumber'>): Promise<PurchaseInvoice> {
    return fetchJson('/api/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify(inv),
    });
  },

  async recordInvoicePayment(id: string, amount: number): Promise<PurchaseInvoice> {
    return fetchJson(`/api/purchase-invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  // Shipments
  async getShipments(branchId?: string): Promise<Shipment[]> {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    return fetchJson(`/api/shipments${query}`);
  },

  async createShipment(shipment: Omit<Shipment, 'id' | 'trackingCode'>): Promise<Shipment> {
    return fetchJson('/api/shipments', {
      method: 'POST',
      body: JSON.stringify(shipment),
    });
  },

  async receiveShipment(id: string): Promise<Shipment> {
    return fetchJson(`/api/shipments/${id}/receive`, {
      method: 'POST',
    });
  },

  // Stock Operations (Pullout, Damage, Stock Out)
  async getStockOperations(branchId?: string): Promise<StockOperation[]> {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    return fetchJson(`/api/stock-operations${query}`);
  },

  async createStockOperation(op: Partial<StockOperation>): Promise<StockOperation> {
    return fetchJson('/api/stock-operations', {
      method: 'POST',
      body: JSON.stringify(op),
    });
  },

  async receiveStockOperation(id: string): Promise<StockOperation> {
    return fetchJson(`/api/stock-operations/${id}/receive`, {
      method: 'POST',
    });
  },

  // Fiscal Years
  async getFiscalYears(): Promise<FiscalYear[]> {
    return fetchJson('/api/fiscal-years');
  },

  async setCurrentFiscalYear(id: string): Promise<FiscalYear[]> {
    return fetchJson(`/api/fiscal-years/${id}/set-current`, {
      method: 'POST',
    });
  },

  // Audit Logs & Transaction Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchJson('/api/audit-trail');
  },

  async getTransactionLogs(): Promise<TransactionLog[]> {
    return fetchJson('/api/transaction-logs');
  },

  // Financial Summary
  async getFinancialSummary(): Promise<FinancialSummary> {
    return fetchJson('/api/reports/financial-summary');
  },

  // Customer Devices & Serial Numbers
  async getCustomerDevices(branchId?: string, query?: string): Promise<CustomerDeviceRecord[]> {
    const params = new URLSearchParams();
    if (branchId && branchId !== 'ALL') params.append('branchId', branchId);
    if (query) params.append('query', query);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchJson(`/api/customer-devices${queryString}`);
  },

  async createCustomerDevice(record: Omit<CustomerDeviceRecord, 'id'>): Promise<CustomerDeviceRecord> {
    return fetchJson('/api/customer-devices', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async updateCustomerDeviceStatus(id: string, status: CustomerDeviceRecord['status']): Promise<CustomerDeviceRecord> {
    return fetchJson(`/api/customer-devices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Gemini AI Analysis
  async generateAiInsight(prompt: string, context?: any): Promise<{ insight: string; timestamp: string }> {
    return fetchJson('/api/ai/analytics', {
      method: 'POST',
      body: JSON.stringify({ prompt, context }),
    });
  },
};
