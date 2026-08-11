import React, { useState, useEffect } from 'react';
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
  CustomerRecord,
  ApprovalRequest,
} from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { ProfileSwitchModal } from './components/ProfileSwitchModal';
import { Dashboard } from './components/Dashboard';
import { ProductManagement } from './components/ProductManagement';
import { BranchStockTracking } from './components/BranchStockTracking';
import { ReorderStockTracking } from './components/ReorderStockTracking';
import { DamagedStockTracking } from './components/DamagedStockTracking';
import { FixedAssetRegister } from './components/FixedAssetRegister';
import { CustomersManagement } from './components/CustomersManagement';
import { CustomerMasterDirectory } from './components/CustomerMasterDirectory';
import { PurchaseOrders, OrderFormLine } from './components/PurchaseOrders';
import { PurchaseInvoices } from './components/PurchaseInvoices';
import { Shipments } from './components/Shipments';
import { StockOperations } from './components/StockOperations';
import { NepaliFiscalManagement } from './components/NepaliFiscalManagement';
import { AuditTrailReports } from './components/AuditTrailReports';
import { BranchesManagement } from './components/BranchesManagement';
import { SuppliersManagement } from './components/SuppliersManagement';
import { UsersManagement } from './components/UsersManagement';
import { PermissionManagement } from './components/PermissionManagement';
import { ExportReports } from './components/ExportReports';
import { FinancialStatements } from './components/FinancialStatements';
import { VatRegister } from './components/VatRegister';
import { DepreciationRegister } from './components/DepreciationRegister';
import { StockValuation } from './components/StockValuation';
import { NotificationCenter } from './components/NotificationCenter';
import { ApprovalWorkflowCenter } from './components/ApprovalWorkflowCenter';
import { StockMovementLedger } from './components/StockMovementLedger';
import { PhysicalStockAudit } from './components/PhysicalStockAudit';
import { FiscalYearClosingWizard } from './components/FiscalYearClosingWizard';
import { WarrantyProducts } from './components/WarrantyProducts';
import { CategoryManagement } from './components/CategoryManagement';
import { UomManagement } from './components/UomManagement';
import { ImportStock } from './components/ImportStock';
import { ExportStock } from './components/ExportStock';
import { LocationsManagement } from './components/LocationsManagement';
import { ImportCustomers } from './components/ImportCustomers';
import { AiAssistantModal } from './components/AiAssistantModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'usr-1',
    email: 'superadmin@izone.net.np',
    name: 'Nabin Shrestha',
    role: 'SUPER_ADMIN',
    canSwitchUser: true,
  });

  const [rootUser, setRootUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('izone_root_user');
      return saved
        ? JSON.parse(saved)
        : {
            id: 'usr-1',
            email: 'superadmin@izone.net.np',
            name: 'Nabin Shrestha',
            role: 'SUPER_ADMIN',
            canSwitchUser: true,
          };
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [dateMode, setDateMode] = useState<'BS' | 'AD'>('BS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [permissionsVersion, setPermissionsVersion] = useState<number>(0);

  // Synchronize permissions live across components
  useEffect(() => {
    const handlePermissionsUpdated = () => {
      setPermissionsVersion((v) => v + 1);
    };
    window.addEventListener('izone_permissions_updated', handlePermissionsUpdated);
    return () => window.removeEventListener('izone_permissions_updated', handlePermissionsUpdated);
  }, []);

  // Global search keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme State: default to light mode (false) as requested, with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('izone_theme');
    return saved === 'dark';
  });

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('izone_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // App Data State
  const [prepopulatedPOLines, setPrepopulatedPOLines] = useState<OrderFormLine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customerDevices, setCustomerDevices] = useState<CustomerDeviceRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stockOperations, setStockOperations] = useState<StockOperation[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalInventoryAssetValue: 0,
    totalFixedAssetValue: 0,
    totalAccountsPayable: 0,
    totalCostOfGoodsSold: 0,
    totalDamageLossValue: 0,
    totalVatInputTax: 0,
    currentFiscalYear: '2082/83',
  });

  // Load state from API
  const refreshAllData = async () => {
    try {
      const [
        brList,
        pList,
        sList,
        astList,
        devList,
        poList,
        invList,
        shList,
        opList,
        fyList,
        audList,
        txnList,
        finSum,
        supList,
        usrList,
        aprList,
        custList,
      ] = await Promise.all([
        api.getBranches(),
        api.getProducts(),
        api.getStock('ALL'),
        api.getAssets(selectedBranchId),
        api.getCustomerDevices(selectedBranchId),
        api.getPurchaseOrders(selectedBranchId),
        api.getPurchaseInvoices(selectedBranchId),
        api.getShipments(selectedBranchId),
        api.getStockOperations(selectedBranchId),
        api.getFiscalYears(),
        api.getAuditLogs(),
        api.getTransactionLogs(),
        api.getFinancialSummary(selectedBranchId),
        api.getSuppliers(),
        api.getUsers(),
        api.getApprovalRequests(selectedBranchId),
        api.getCustomers(selectedBranchId),
      ]);

      setBranches(brList);
      setProducts(pList);
      setStock(sList);
      setAssets(astList);
      setCustomerDevices(devList);
      setCustomers(custList);
      setPurchaseOrders(poList);
      setPurchaseInvoices(invList);
      setShipments(shList);
      setStockOperations(opList);
      setFiscalYears(fyList);
      setAuditLogs(audList);
      setTransactionLogs(txnList);
      setFinancialSummary(finSum);
      setSuppliers(supList);
      setUsers(usrList);
      setApprovalRequests(aprList);
    } catch (err) {
      console.error('Error fetching data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApprovalRequest = async (
    requestData: Omit<ApprovalRequest, 'id' | 'requestNumber' | 'status' | 'requestedAtAD' | 'requestedAtBS'>
  ) => {
    await api.createApprovalRequest(requestData);
    await refreshAllData();
  };

  const handleProcessApprovalRequest = async (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) => {
    await api.processApprovalRequest(id, status, currentUser, rejectionReason);
    await refreshAllData();
  };

  // Fetch data on initial mount and whenever selectedBranchId changes
  useEffect(() => {
    refreshAllData();
  }, [selectedBranchId]);

  // React to currentUser state changes & enforce branch/tab restrictions
  useEffect(() => {
    if (currentUser) {
      if (currentUser.branchId && currentUser.branchId !== 'ALL' && currentUser.role !== 'SUPER_ADMIN') {
        setSelectedBranchId(currentUser.branchId);
      } else if (currentUser.branchId === 'ALL' || currentUser.role === 'SUPER_ADMIN') {
        // Keep or allow branch selection
      }

      // Check for restricted tabs
      const adminOnlyTabs = ['branches', 'suppliers', 'users', 'permissions', 'audit', 'create-shipment'];
      if (adminOnlyTabs.includes(activeTab) && currentUser.role !== 'SUPER_ADMIN') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser]);

  // Handle Branch Selection with restriction for branch users
  const handleSelectBranch = (bId: string) => {
    if (currentUser?.branchId && currentUser.branchId !== 'ALL' && currentUser.role !== 'SUPER_ADMIN') {
      setSelectedBranchId(currentUser.branchId);
    } else {
      setSelectedBranchId(bId);
    }
  };

  // Auth actions
  const handleLogin = async (e: string, p: string) => {
    const res = await api.login(e, p);
    setCurrentUser(res.user);
    setRootUser(res.user);
    localStorage.setItem('izone_root_user', JSON.stringify(res.user));
    refreshAllData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setRootUser(null);
    localStorage.removeItem('izone_root_user');
  };

  const handleSwitchProfile = async (targetUserId: string) => {
    if (!rootUser && currentUser) {
      setRootUser(currentUser);
      localStorage.setItem('izone_root_user', JSON.stringify(currentUser));
    }
    const res = await api.switchProfile(targetUserId);
    setCurrentUser(res.user);
    await refreshAllData();
  };

  const handleSwitchBackToRoot = async () => {
    if (!rootUser) return;
    const res = await api.switchProfile(rootUser.id);
    setCurrentUser(res.user);
    await refreshAllData();
  };

  const handleUpdateProfile = async (data: Partial<User> & { newPassword?: string }) => {
    const updatedUser = await api.updateProfile(data);
    setCurrentUser(updatedUser);
    await refreshAllData();
  };

  // Product Actions
  const handleCreateProduct = async (prod: Omit<Product, 'id'>) => {
    await api.createProduct(prod);
    refreshAllData();
  };

  const handleUpdateProduct = async (id: string, prod: Partial<Product>) => {
    await api.updateProduct(id, prod);
    refreshAllData();
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    refreshAllData();
  };

  // Stock Actions
  const handleUpdateStockLevel = async (
    stockId: string,
    newQty: number,
    reason: string,
    damagedQty?: number,
    changeType?: string
  ) => {
    await api.updateStockLevel(stockId, newQty, reason, damagedQty, changeType);
    refreshAllData();
  };

  const handleUpdateStockReorderLevel = async (
    stockId: string,
    minReorderLevel: number
  ) => {
    await api.updateStockReorderLevel(stockId, minReorderLevel);
    refreshAllData();
  };

  const handleBulkUpdateStockReorderLevels = async (
    updates: { stockId: string; minReorderLevel: number }[]
  ) => {
    await api.bulkUpdateStockReorderLevels(updates);
    refreshAllData();
  };

  const handleCreateStockTransfer = async (
    sourceBranchId: string,
    destBranchId: string,
    productId: string,
    qty: number
  ) => {
    const prod = products.find((p) => p.id === productId);
    await api.createShipment({
      type: 'INTER_BRANCH',
      sourceBranchId,
      destinationBranchId: destBranchId,
      destinationBranchName:
        branches.find((b) => b.id === destBranchId)?.name || 'Branch',
      dispatchDateAD: new Date().toISOString().split('T')[0],
      dispatchDateBS: '2083-04-16 BS',
      estimatedArrivalAD: new Date(Date.now() + 3 * 86400000)
        .toISOString()
        .split('T')[0],
      status: 'IN_TRANSIT',
      items: [
        {
          id: `item-${Date.now()}`,
          productId,
          productName: prod?.name || 'Item',
          sku: prod?.sku || 'SKU',
          quantitySent: qty,
        },
      ],
    });
    refreshAllData();
  };

  // Asset Actions
  const handleCreateAsset = async (
    asset: Omit<Asset, 'id' | 'netBookValue' | 'accumulatedDepreciation'>
  ) => {
    await api.createAsset(asset);

    // Stock-Out Integration: If asset has a productId associated, decrement branch inventory stock
    if (asset.productId) {
      await api.createStockOperation({
        type: 'STOCK_OUT',
        branchId: asset.branchId,
        productId: asset.productId,
        productName: asset.name,
        quantityChanged: -1,
        costPerUnit: asset.acquisitionCost,
        totalValue: asset.acquisitionCost,
        reason: `Fixed Asset Issued / Assigned: Tag ${asset.tagNumber} (${asset.name})`,
        inspectorName: currentUser?.name || 'Asset Manager',
        dateAD: asset.acquisitionDateAD,
        dateBS: asset.acquisitionDateBS,
        fiscalYear: financialSummary?.currentFiscalYear || '2081/82',
        status: 'LOGGED',
      });
    }

    refreshAllData();
  };

  const handleUpdateAssetStatus = async (id: string, status: Asset['status']) => {
    await api.updateAssetStatus(id, status);
    refreshAllData();
  };

  // PO Actions
  const handleCreatePO = async (
    po: Omit<
      PurchaseOrder,
      'id' | 'poNumber' | 'subtotalAmount' | 'taxAmount' | 'totalAmount'
    >
  ) => {
    await api.createPurchaseOrder(po);
    refreshAllData();
  };

  const handleReceivePO = async (poId: string) => {
    await api.receivePurchaseOrder(poId);
    refreshAllData();
  };

  const handleUpdatePOStatus = async (poId: string, status: string) => {
    await api.updatePurchaseOrderStatus(poId, status);
    refreshAllData();
  };

  // Invoice Actions
  const handleCreateInvoice = async (
    inv: Omit<PurchaseInvoice, 'id' | 'invoiceNumber'>
  ) => {
    const created = await api.createPurchaseInvoice(inv);
    
    // Automatically provision device serial inventory records for hardware assets purchased
    if (inv.items) {
      for (const item of inv.items) {
        if (item.deviceSerials && item.deviceSerials.length > 0) {
          for (const sPair of item.deviceSerials) {
            await api.createCustomerDevice({
              customerId: `CUST-STOCK-${Date.now()}`,
              customerName: 'Unassigned Stock',
              customerCode: 'STOCK-INV',
              contactPhone: '-',
              installationAddress: 'Warehouse / Branch Stock',
              branchId: inv.branchId,
              productName: item.productName,
              deviceSerial: sPair.deviceSerial,
              ponSerial: sPair.ponSerial || '-',
              macAddress: sPair.macAddress || '-',
              status: 'IN_STOCK',
              issuedDateAD: inv.invoiceDateAD,
              issuedDateBS: inv.invoiceDateBS,
              purchaseBillRef: created.vendorBillNumber || created.invoiceNumber,
            });
          }
        }
      }
    }

    refreshAllData();
  };

  const handleRecordPayment = async (id: string, amount: number) => {
    await api.recordInvoicePayment(id, amount);
    refreshAllData();
  };

  // Shipment Actions
  const handleReceiveShipment = async (id: string) => {
    await api.receiveShipment(id);
    refreshAllData();
  };

  // Stock Operations Actions
  const handleCreateOperation = async (op: Partial<StockOperation>) => {
    await api.createStockOperation(op);
    refreshAllData();
  };

  const handleReceiveOperation = async (id: string) => {
    await api.receiveStockOperation(id);
    refreshAllData();
  };

  // Fiscal Year Actions
  const handleSetCurrentFiscalYear = async (id: string) => {
    await api.setCurrentFiscalYear(id);
    refreshAllData();
  };

  // Badge calculations
  const lowStockCount = stock.filter((s) => {
    const prod = products.find((p) => p.id === s.productId);
    if (!prod) return false;
    return prod.minReorderLevel > 0
      ? s.quantityOnHand <= prod.minReorderLevel
      : s.quantityOnHand < 0;
  }).length;

  const pendingPoCount = purchaseOrders.filter(
    (po) => po.status === 'SENT' || po.status === 'APPROVED'
  ).length;

  const inTransitShipmentCount = shipments.filter(
    (sh) => sh.status === 'IN_TRANSIT' || sh.status === 'DISPATCHED'
  ).length;

  const activeFy =
    fiscalYears.find((f) => f.isCurrent)?.code || financialSummary.currentFiscalYear;

  const handleGroupLowStockPO = () => {
    const lowStockItems = stock.filter((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return false;
      return product.minReorderLevel > 0
        ? item.quantityOnHand <= product.minReorderLevel
        : item.quantityOnHand < 0;
    });

    const lowStockProductMap = new Map<string, { product: Product; qty: number }>();

    lowStockItems.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return;

      const deficit = prod.minReorderLevel > 0
        ? Math.max(1, prod.minReorderLevel - item.quantityOnHand)
        : (item.quantityOnHand < 0 ? Math.abs(item.quantityOnHand) : 0);

      if (deficit <= 0) return;

      if (lowStockProductMap.has(prod.id)) {
        const curr = lowStockProductMap.get(prod.id)!;
        curr.qty += deficit;
      } else {
        lowStockProductMap.set(prod.id, { product: prod, qty: deficit });
      }
    });

    const lines: OrderFormLine[] = Array.from(lowStockProductMap.values()).map(
      ({ product, qty }) => ({
        productId: product.id,
        quantity: Math.max(1, qty),
        unitPrice: product.costPrice,
        discount: 0,
        isTaxExempt: product.taxRate === 0,
      })
    );

    setPrepopulatedPOLines(lines);
    setActiveTab('create-po');
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden font-sans flex flex-col antialiased transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0a0c10] text-slate-300' : 'bg-[#f0f2f5] text-slate-800'
      }`}
    >
      {/* Login Overlay if Logged Out */}
      {!currentUser && <LoginModal onLoginSuccess={handleLogin} />}

      {/* Top App Header (Fixed at top) */}
      <Header
        currentUser={currentUser}
        rootUser={rootUser}
        onSwitchBackToRoot={handleSwitchBackToRoot}
        users={users}
        onSwitchProfile={handleSwitchProfile}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelectBranch={handleSelectBranch}
        dateMode={dateMode}
        onToggleDateMode={() => setDateMode(dateMode === 'BS' ? 'AD' : 'BS')}
        currentFiscalYear={activeFy}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
        onOpenSearchModal={() => setIsGlobalSearchOpen(true)}
        onLogout={handleLogout}
        onSwitchUser={handleLogin}
        onRefreshData={refreshAllData}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        lowStockCount={lowStockCount}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        products={products}
        stock={stock}
        approvalRequests={approvalRequests}
        purchaseOrders={purchaseOrders}
        shipments={shipments}
        onSelectTab={setActiveTab}
        onOpenNotification={() => setIsNotificationOpen((prev) => !prev)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)] relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Navigation Sidebar (Drawer on Mobile, Static on Desktop) */}
        <div
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            currentUser={currentUser}
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setIsSidebarOpen(false); // Auto close sidebar on mobile selection
            }}
            lowStockCount={lowStockCount}
            pendingPoCount={pendingPoCount}
            inTransitShipmentCount={inTransitShipmentCount}
            pendingApprovalCount={approvalRequests.filter((r) => r.status === 'PENDING').length}
            isDarkMode={isDarkMode}
            onCloseMobile={() => setIsSidebarOpen(false)}
            onSwitchUser={handleLogin}
          />
        </div>

        {/* Main Content Viewport */}
        <main
          className={`flex-1 overflow-y-auto p-2.5 sm:p-3.5 transition-colors duration-200 ${
            isDarkMode ? 'bg-[#0a0c10]' : 'bg-[#f8fafc]'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">
                Synchronizing multi-branch inventory database...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  currentUser={currentUser}
                  products={products}
                  stock={stock}
                  branches={branches}
                  assets={assets}
                  purchaseOrders={purchaseOrders}
                  shipments={shipments}
                  transactionLogs={transactionLogs}
                  financialSummary={financialSummary}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  approvalRequests={approvalRequests}
                  onProcessApproval={handleProcessApprovalRequest}
                  onNavigateTab={setActiveTab}
                  onSelectBranch={handleSelectBranch}
                  onOpenAiModal={() => setIsAiModalOpen(true)}
                  onGroupLowStockPO={handleGroupLowStockPO}
                  onUpdateStockLevel={handleUpdateStockLevel}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'approvals' && (
                <ApprovalWorkflowCenter
                  approvalRequests={approvalRequests}
                  branches={branches}
                  currentUser={currentUser}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                  onProcessApproval={handleProcessApprovalRequest}
                />
              )}

              {activeTab === 'all-stock' && (
                <ProductManagement
                  currentUser={currentUser}
                  products={products}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  onCreateProduct={handleCreateProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  searchQuery={searchQuery}
                  isDarkMode={isDarkMode}
                  mode="all-stock"
                />
              )}

              {activeTab === 'product-master' && (
                <ProductManagement
                  currentUser={currentUser}
                  products={products}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  onCreateProduct={handleCreateProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  searchQuery={searchQuery}
                  isDarkMode={isDarkMode}
                  mode="product-master"
                />
              )}

              {activeTab === 'category-management' && (
                <CategoryManagement
                  currentUser={currentUser}
                  products={products}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'uom-management' && (
                <UomManagement
                  currentUser={currentUser}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'import-stock' && (
                <ImportStock
                  currentUser={currentUser}
                  branches={branches}
                  products={products}
                  onCreateProduct={handleCreateProduct}
                  onRefreshData={refreshAllData}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'export-stock' && (
                <ExportStock
                  currentUser={currentUser}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'branch-stock' && (
                <BranchStockTracking
                  currentUser={currentUser}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  onUpdateStockLevel={handleUpdateStockLevel}
                  onCreateStockTransfer={handleCreateStockTransfer}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'reorder-stock' && (
                <ReorderStockTracking
                  currentUser={currentUser}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  onUpdateStockLevel={handleUpdateStockLevel}
                  onUpdateStockReorderLevel={handleUpdateStockReorderLevel}
                  onBulkUpdateStockReorderLevels={handleBulkUpdateStockReorderLevels}
                  onGroupLowStockPO={handleGroupLowStockPO}
                  onNavigateTab={setActiveTab}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'damaged-stock' && (
                <DamagedStockTracking
                  currentUser={currentUser}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  onUpdateStockLevel={handleUpdateStockLevel}
                  onNavigateTab={setActiveTab}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'stock-valuation' && (
                <StockValuation
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'stock-ledger' && (
                <StockMovementLedger
                  transactionLogs={transactionLogs}
                  products={products}
                  branches={branches}
                  stock={stock}
                  stockOperations={stockOperations}
                  shipments={shipments}
                  purchaseOrders={purchaseOrders}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'physical-stock-audit' && (
                <PhysicalStockAudit
                  currentUser={currentUser}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                  onUpdateStockLevel={handleUpdateStockLevel}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'fixed-assets' && (
                <FixedAssetRegister
                  currentUser={currentUser}
                  assets={assets}
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  onCreateAsset={handleCreateAsset}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerMasterDirectory
                  customers={customers}
                  customerDevices={customerDevices}
                  branches={branches}
                  currentUser={currentUser}
                  onAddCustomer={async (customer) => {
                    await api.createCustomer(customer);
                    await refreshAllData();
                  }}
                  onUpdateCustomer={async (id, updates) => {
                    await api.updateCustomer(id, updates);
                    await refreshAllData();
                  }}
                  onDeleteCustomer={async (id) => {
                    await api.deleteCustomer(id);
                    await refreshAllData();
                  }}
                  onNavigateToImport={() => setActiveTab('import-customers')}
                  onSelectTab={(tab, filter) => {
                    setActiveTab(tab as any);
                    if (filter) setSearchQuery(filter);
                  }}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'customer-devices' && (
                <CustomersManagement
                  currentUser={currentUser}
                  customerDevices={customerDevices}
                  customers={customers}
                  branches={branches}
                  products={products}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  onCreateCustomerDevice={async (newRecord) => {
                    await api.createCustomerDevice(newRecord);
                    await refreshAllData();
                  }}
                  onUpdateStatus={async (id, status) => {
                    await api.updateCustomerDeviceStatus(id, status);
                    await refreshAllData();
                  }}
                  onRequestApproval={handleCreateApprovalRequest}
                  onNavigateToMaster={() => setActiveTab('customers')}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'locations' && (
                <LocationsManagement
                  branches={branches}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'import-customers' && (
                <ImportCustomers
                  branches={branches}
                  onImportCustomersSuccess={async (newCustomers) => {
                    await api.bulkImportCustomers(newCustomers);
                    await refreshAllData();
                  }}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'create-po' && (
                <PurchaseOrders
                  purchaseOrders={purchaseOrders}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  autoOpenModal={true}
                  prepopulatedLines={prepopulatedPOLines}
                  onCreatePO={handleCreatePO}
                  onReceivePO={handleReceivePO}
                  onUpdatePOStatus={handleUpdatePOStatus}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'po-list' && (
                <PurchaseOrders
                  purchaseOrders={purchaseOrders}
                  products={products}
                  branches={branches}
                  stock={stock}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  autoOpenModal={false}
                  prepopulatedLines={prepopulatedPOLines}
                  onCreatePO={handleCreatePO}
                  onReceivePO={handleReceivePO}
                  onUpdatePOStatus={handleUpdatePOStatus}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'create-purchase' && (
                <PurchaseInvoices
                  invoices={purchaseInvoices}
                  products={products}
                  branches={branches}
                  stock={stock}
                  purchaseOrders={purchaseOrders}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  autoOpenModal={true}
                  onCreateInvoice={handleCreateInvoice}
                  onRecordPayment={handleRecordPayment}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'purchase-list' && (
                <PurchaseInvoices
                  invoices={purchaseInvoices}
                  products={products}
                  branches={branches}
                  stock={stock}
                  purchaseOrders={purchaseOrders}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  autoOpenModal={false}
                  onCreateInvoice={handleCreateInvoice}
                  onRecordPayment={handleRecordPayment}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'create-shipment' && (
                <Shipments
                  currentUser={currentUser}
                  activeTab="create-shipment"
                  shipments={shipments}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'create-transfer' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="CREATE_TRANSFER"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'receive-shipment' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="RECEIVE_TRANSFER"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'shipment-list' && (
                <Shipments
                  currentUser={currentUser}
                  activeTab={activeTab}
                  shipments={shipments}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'pullout' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="PULLOUT"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'damage' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="DAMAGE"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'stock-out' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="STOCK_OUT"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'assign-asset' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="ASSIGN_ASSET"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'consumable-issue' && (
                <StockOperations
                  operations={stockOperations}
                  products={products}
                  branches={branches}
                  stock={stock}
                  customerDevices={customerDevices}
                  customers={customers}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  initialType="CONSUMABLE_ISSUE"
                  autoOpenModal={false}
                  isDarkMode={isDarkMode}
                  currentUser={currentUser}
                  shipments={shipments}
                  assets={assets}
                  onCreateOperation={handleCreateOperation}
                  onReceiveOperation={handleReceiveOperation}
                  onCreateShipment={async (sh) => {
                    await api.createShipment(sh);
                    refreshAllData();
                  }}
                  onReceiveShipment={handleReceiveShipment}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                />
              )}

              {activeTab === 'warranty-products' && (
                <WarrantyProducts
                  customerDevices={customerDevices}
                  assets={assets}
                  branches={branches}
                  products={products}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'branches' && (
                <BranchesManagement
                  currentUser={currentUser}
                  branches={branches}
                  onCreateBranch={async (b) => {
                    await api.createBranch(b);
                    refreshAllData();
                  }}
                  onUpdateBranch={async (id, b) => {
                    await api.updateBranch(id, b);
                    refreshAllData();
                  }}
                  onDeleteBranch={async (id) => {
                    await api.deleteBranch(id);
                    refreshAllData();
                  }}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'suppliers' && (
                <SuppliersManagement
                  currentUser={currentUser}
                  suppliers={suppliers}
                  onCreateSupplier={async (s) => {
                    await api.createSupplier(s);
                    refreshAllData();
                  }}
                  onUpdateSupplier={async (id, s) => {
                    await api.updateSupplier(id, s);
                    refreshAllData();
                  }}
                  onDeleteSupplier={async (id) => {
                    await api.deleteSupplier(id);
                    refreshAllData();
                  }}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'users' && (
                <UsersManagement
                  currentUser={currentUser}
                  users={users}
                  branches={branches}
                  onCreateUser={async (u) => {
                    await api.createUser(u);
                    refreshAllData();
                  }}
                  onUpdateUser={async (id, u) => {
                    await api.updateUser(id, u);
                    refreshAllData();
                  }}
                  onDeleteUser={async (id) => {
                    await api.deleteUser(id);
                    refreshAllData();
                  }}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'permissions' && (
                <PermissionManagement currentUser={currentUser} isDarkMode={isDarkMode} />
              )}

              {activeTab === 'financial-statements' && (
                <FinancialStatements
                  financialSummary={financialSummary}
                  assets={assets}
                  invoices={purchaseInvoices}
                  purchaseOrders={purchaseOrders}
                  dateMode={dateMode}
                  onOpenAiModal={() => setIsAiModalOpen(true)}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'vat-register' && (
                <VatRegister
                  invoices={purchaseInvoices}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'depreciation-register' && (
                <DepreciationRegister
                  assets={assets}
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'audit' && (
                <AuditTrailReports
                  auditLogs={auditLogs}
                  transactionLogs={transactionLogs}
                  financialSummary={financialSummary}
                  products={products}
                  branches={branches}
                  assets={assets}
                  invoices={purchaseInvoices}
                  dateMode={dateMode}
                  onOpenAiModal={() => setIsAiModalOpen(true)}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'fiscal-year-closing' && (
                <FiscalYearClosingWizard
                  fiscalYears={fiscalYears}
                  onSetCurrentFiscalYear={handleSetCurrentFiscalYear}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                  financialSummary={financialSummary}
                  products={products}
                  stock={stock}
                  assets={assets}
                  purchaseInvoices={purchaseInvoices}
                  currentUser={currentUser}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'nepali-fiscal' && (
                <NepaliFiscalManagement
                  fiscalYears={fiscalYears}
                  onSetCurrentFiscalYear={handleSetCurrentFiscalYear}
                  dateMode={dateMode}
                />
              )}

              {activeTab === 'export-reports' && (
                <ExportReports
                  currentUser={currentUser}
                  purchaseOrders={purchaseOrders}
                  invoices={purchaseInvoices}
                  shipments={shipments}
                  branches={branches}
                  suppliers={suppliers}
                  dateMode={dateMode}
                  isDarkMode={isDarkMode}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* AI Strategist Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        systemContext={{
          branchCount: branches.length,
          productCount: products.length,
          lowStockCount,
          pendingPoCount,
          activeFy,
        }}
      />

      {/* Barcode & Serial Scanner / Printable Label Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={products}
      />

      {/* Global Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        products={products}
        purchaseOrders={purchaseOrders}
        invoices={purchaseInvoices}
        shipments={shipments}
        assets={assets}
        customerDevices={customerDevices}
        suppliers={suppliers}
        branches={branches}
        stock={stock}
        selectedBranchId={selectedBranchId}
        onSelectResult={(tab, filterText) => {
          setActiveTab(tab);
          if (filterText !== undefined) {
            setSearchQuery(filterText);
          }
          setIsGlobalSearchOpen(false);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Realtime Notification & Action Center Modal */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        products={products}
        stock={stock}
        approvalRequests={approvalRequests}
        purchaseOrders={purchaseOrders}
        shipments={shipments}
        branches={branches}
        selectedBranchId={selectedBranchId}
        isDarkMode={isDarkMode}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsNotificationOpen(false);
        }}
      />

      {/* User Profile Info & Profile Switching Modal */}
      <ProfileSwitchModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        rootUser={rootUser}
        onSwitchBackToRoot={handleSwitchBackToRoot}
        users={users}
        branches={branches}
        onSwitchProfile={handleSwitchProfile}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
