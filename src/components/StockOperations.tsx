import React, { useState, useEffect } from 'react';
import {
  StockOperation,
  Product,
  Branch,
  InventoryStock,
  PulloutItem,
  User,
  Shipment,
  Asset,
  LocationRecord,
  CustomerRecord,
} from '../types';
import { initialLocationsData, initialCustomersData } from '../data/initialData';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  AlertOctagon,
  Plus,
  Trash2,
  X,
  Search,
  Barcode,
  Package,
  Building2,
  CheckCircle2,
  Truck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Filter,
  Info,
  ShieldCheck,
  Tag,
  Send,
  Inbox,
  Wrench,
  PackageMinus,
  MapPin,
  UserCheck,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Lock,
  ClipboardList,
} from 'lucide-react';
import { isOperationAllowed, canUserSeeAllBranches, getAllowedBranches, getAllowedBranchIds } from '../utils/permissions';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface StockOperationsProps {
  operations: StockOperation[];
  products: Product[];
  branches: Branch[];
  stock?: InventoryStock[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  initialType?: string;
  autoOpenModal?: boolean;
  isDarkMode?: boolean;
  currentUser?: User | null;
  shipments?: Shipment[];
  assets?: Asset[];
  locations?: LocationRecord[];
  customers?: CustomerRecord[];
  onCreateOperation: (op: Partial<StockOperation>) => Promise<void>;
  onReceiveOperation?: (id: string) => Promise<void>;
  onCreateShipment?: (sh: Partial<Shipment>) => Promise<void>;
  onReceiveShipment?: (id: string) => Promise<void>;
  onUpdateAssetStatus?: (id: string, updates: Asset['status'] | Partial<Asset>) => Promise<void>;
}

export const StockOperations: React.FC<StockOperationsProps> = ({
  operations,
  products,
  branches,
  stock = [],
  selectedBranchId,
  dateMode,
  initialType = 'PULLOUT',
  autoOpenModal = false,
  isDarkMode = false,
  currentUser = null,
  shipments = [],
  assets = [],
  locations = initialLocationsData,
  customers = initialCustomersData,
  onCreateOperation,
  onReceiveOperation,
  onCreateShipment,
  onReceiveShipment,
  onUpdateAssetStatus,
}) => {
  // Determine role permissions for Damage Labeling
  const isSuperOrInventory =
    currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role as string) === 'INVENTORY_CONTROLLER';

  // Map initial tab
  const getInitialTab = (): 'PULLOUT_BINS' | 'DAMAGE_TRACKING' | 'RECEIVE_TRANSFER' | 'CREATE_TRANSFER' | 'ASSIGN_ASSET' | 'CONSUMABLE_ISSUE' | 'PRODUCT_SALE' | 'LOGS' => {
    if (initialType === 'CONSUMABLE_ISSUE') return 'CONSUMABLE_ISSUE';
    if (initialType === 'DAMAGE') return 'DAMAGE_TRACKING';
    if (initialType === 'RECEIVE_TRANSFER' || initialType === 'RECEIVE') return 'RECEIVE_TRANSFER';
    if (initialType === 'CREATE_TRANSFER' || initialType === 'TRANSFER') return 'CREATE_TRANSFER';
    if (initialType === 'ASSIGN_ASSET' || initialType === 'ASSIGN') return 'ASSIGN_ASSET';
    if (initialType === 'STOCK_OUT' || initialType === 'PRODUCT_SALE') return 'PRODUCT_SALE';
    if (initialType === 'LOGS') return 'LOGS';
    return 'PULLOUT_BINS';
  };

  const [activeTab, setActiveTab] = useState<
    'PULLOUT_BINS' | 'DAMAGE_TRACKING' | 'RECEIVE_TRANSFER' | 'CREATE_TRANSFER' | 'ASSIGN_ASSET' | 'CONSUMABLE_ISSUE' | 'PRODUCT_SALE' | 'LOGS'
  >(getInitialTab());

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [initialType]);

  // Filter state
  const [branchFilter, setBranchFilter] = useState<string>(selectedBranchId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBinId, setExpandedBinId] = useState<string | null>(null);

  // Modals state
  const [isPulloutModalOpen, setIsPulloutModalOpen] = useState(autoOpenModal && initialType === 'PULLOUT');
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(autoOpenModal && initialType === 'DAMAGE');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Selected asset for assignment modal
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<Asset | null>(null);

  // Allowed branches for current user
  const allowedBranches = getAllowedBranches(currentUser, branches);
  const allowedBranchIds = getAllowedBranchIds(currentUser, branches);
  const canSeeAll = canUserSeeAllBranches(currentUser);

  // --- FORM STATES ---

  // 1. Pullout Bin Form State
  const userBranchId = allowedBranches[0]?.id || branches[0]?.id || '';
  const [sourceBranchId, setSourceBranchId] = useState<string>(userBranchId);
  const [destWarehouseId, setDestWarehouseId] = useState<string>(
    branches.find((b) => b.isHeadquarters)?.id || 'BR-KTM'
  );
  const [binInspector, setBinInspector] = useState<string>(currentUser?.name || 'Logistics Officer');
  const [binNotes, setBinNotes] = useState<string>('Overstock / Damaged stock return dispatch to central warehouse');
  const [pulloutItems, setPulloutItems] = useState<PulloutItem[]>([]);
  const [prodSearchInput, setProdSearchInput] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // 2. Damage Labeling Form State
  const defaultDamageBranch = userBranchId;
  const [damageBranchId, setDamageBranchId] = useState<string>(defaultDamageBranch);
  const [damageProductId, setDamageProductId] = useState<string>(products[0]?.id || '');
  const [damageQty, setDamageQty] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('Overstock transit damage / defective hardware unit');
  const [damageInspector, setDamageInspector] = useState<string>(currentUser?.name || 'Branch Quality Inspector');

  // 3. Create Transfer Form State
  const [xferSourceBranchId, setXferSourceBranchId] = useState<string>(userBranchId);
  const [xferDestBranchId, setXferDestBranchId] = useState<string>(
    branches.find((b) => b.id !== userBranchId)?.id || branches[1]?.id || ''
  );
  const [xferProductId, setXferProductId] = useState<string>(products[0]?.id || '');
  const [xferQty, setXferQty] = useState<number>(1);
  const [xferNotes, setXferNotes] = useState<string>('Inter-branch inventory transfer dispatch');

  // 4. Assign Fixed Asset Form State
  const [assignTargetType, setAssignTargetType] = useState<'LOCATION' | 'CUSTOMER'>('LOCATION');
  const [assignLocationId, setAssignLocationId] = useState<string>(locations[0]?.id || '');
  const [assignCustomerId, setAssignCustomerId] = useState<string>(customers[0]?.id || '');
  const [assignNotes, setAssignNotes] = useState<string>('Installed & commissioned as operational fixed asset');

  // 5. Product Sale Form State
  const [saleCustomerId, setSaleCustomerId] = useState<string>(customers[0]?.id || '');
  const [saleBranchId, setSaleBranchId] = useState<string>(userBranchId);
  const [saleProductId, setSaleProductId] = useState<string>(products[0]?.id || '');
  const [saleQty, setSaleQty] = useState<number>(1);
  const [salePrice, setSalePrice] = useState<number>(products[0]?.sellingPrice || 1000);
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>('Cash / Direct Payment');
  const [saleNotes, setSaleNotes] = useState<string>('Direct retail product item sale to customer');

  // 6. Consumable Issue Form State (Splitters, Sleeves, Couplers field usage)
  const [consumableBranchId, setConsumableBranchId] = useState<string>(userBranchId);
  const [consumableProductId, setConsumableProductId] = useState<string>(
    products.find((p) => p.productGroup === 'Consumable Item')?.id || products[0]?.id || ''
  );
  const [consumableQty, setConsumableQty] = useState<number>(5);
  const [consumableTechnician, setConsumableTechnician] = useState<string>('Field Splicing Technician');
  const [consumableWorkOrder, setConsumableWorkOrder] = useState<string>('WO-2081-SPLIT-01');
  const [consumableReason, setConsumableReason] = useState<string>('Field fiber splicing & customer drop installation material usage');

  // Filtered products for pullout search
  const matchingProducts = products.filter((p) => {
    if (!prodSearchInput.trim()) return false;
    const q = prodSearchInput.toLowerCase().trim();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const handleAddProductToPullout = (prod: Product) => {
    const existing = pulloutItems.find((i) => i.productId === prod.id);
    if (existing) {
      setPulloutItems(
        pulloutItems.map((i) =>
          i.productId === prod.id
            ? { ...i, quantity: i.quantity + 1, totalValue: (i.quantity + 1) * i.unitCost }
            : i
        )
      );
    } else {
      const srcStock = stock.find((s) => s.productId === prod.id && s.branchId === sourceBranchId);
      const availDamaged = srcStock?.damagedQty || 0;
      const defaultCond = availDamaged > 0 ? 'DAMAGED_STOCK' : 'OVERSTOCK';

      setPulloutItems([
        ...pulloutItems,
        {
          id: `pli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          quantity: 1,
          condition: defaultCond,
          unitCost: prod.costPrice,
          totalValue: prod.costPrice,
          reason: defaultCond === 'DAMAGED_STOCK' ? 'Damaged inventory return' : 'Surplus overstock return to warehouse',
        },
      ]);
    }
    setProdSearchInput('');
    setIsSearchOpen(false);
  };

  const handleUpdatePulloutItem = (id: string, updates: Partial<PulloutItem>) => {
    setPulloutItems(
      pulloutItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          updated.totalValue = updated.quantity * updated.unitCost;
        }
        return updated;
      })
    );
  };

  const handleRemovePulloutItem = (id: string) => {
    setPulloutItems(pulloutItems.filter((i) => i.id !== id));
  };

  // 1. Submit Pullout Dispatch
  const handleSubmitPulloutBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pulloutItems.length === 0) {
      alert('Please add at least one stock item to the pullout bin.');
      return;
    }

    const srcBranch = branches.find((b) => b.id === sourceBranchId);
    const destWh = branches.find((b) => b.id === destWarehouseId);
    const grandTotal = pulloutItems.reduce((sum, item) => sum + item.totalValue, 0);

    await onCreateOperation({
      type: 'PULLOUT',
      branchId: sourceBranchId,
      branchName: srcBranch?.name,
      destinationWarehouseId: destWarehouseId,
      destinationWarehouseName: destWh?.name,
      items: pulloutItems,
      totalValue: grandTotal,
      reason: binNotes,
      inspectorName: binInspector,
      status: 'DISPATCHED',
    });

    setIsPulloutModalOpen(false);
    setPulloutItems([]);
  };

  // 2. Submit Local Damage Tagging
  const handleSubmitDamageTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = !isSuperOrInventory && currentUser?.branchId ? currentUser.branchId : damageBranchId;
    const prod = products.find((p) => p.id === damageProductId);
    if (!prod) return;

    await onCreateOperation({
      type: 'DAMAGE',
      branchId: targetBranch,
      productId: damageProductId,
      productName: prod.name,
      quantityChanged: Number(damageQty),
      costPerUnit: prod.costPrice,
      totalValue: Number(damageQty) * prod.costPrice,
      reason: damageReason,
      inspectorName: damageInspector,
      status: 'LOGGED',
    });

    setIsDamageModalOpen(false);
  };

  // 3. Submit Create Transfer
  const handleSubmitCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === xferProductId);
    const srcBranch = branches.find((b) => b.id === xferSourceBranchId);
    const destBranch = branches.find((b) => b.id === xferDestBranchId);

    if (!prod || !srcBranch || !destBranch) return;

    if (xferSourceBranchId === xferDestBranchId) {
      alert('Source and Destination branches must be different.');
      return;
    }

    // Generate serial pairs if product requires serial/MAC/PON tracking
    const deviceSerials = [];
    if (prod.requiresSerialTracking || prod.trackingType === 'SERIAL_MAC_PON') {
      for (let i = 0; i < Number(xferQty); i++) {
        deviceSerials.push({
          deviceSerial: `SN-${prod.sku}-${Math.floor(100000 + Math.random() * 900000)}`,
          ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
        });
      }
    }

    if (onCreateShipment) {
      await onCreateShipment({
        trackingCode: `TRF-BR-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'INTER_BRANCH',
        sourceBranchId: xferSourceBranchId,
        sourceBranchName: srcBranch.name,
        destinationBranchId: xferDestBranchId,
        destinationBranchName: destBranch.name,
        dispatchDateAD: new Date().toISOString().split('T')[0],
        dispatchDateBS: '2083-04-16 BS',
        estimatedArrivalAD: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        status: 'DISPATCHED',
        items: [
          {
            id: `item-${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            unit: prod.unit,
            quantity: Number(xferQty),
            quantitySent: Number(xferQty),
            deviceSerials: deviceSerials.length > 0 ? deviceSerials : undefined,
          },
        ],
        notes: xferNotes,
      });
      alert(`Inter-Branch Stock Transfer TRF-BR-${Math.floor(100000 + Math.random() * 900000)} successfully dispatched with serial tracking intact!`);
      setActiveTab('RECEIVE_TRANSFER');
    }
  };

  // 4. Submit Assign Fixed Asset
  const handleOpenAssignModal = (asset: Asset) => {
    setSelectedAssetForAssign(asset);
    setIsAssignModalOpen(true);
  };

  const handleSubmitAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAssign || !onUpdateAssetStatus) return;

    const todayAD = new Date().toISOString().split('T')[0];
    const todayBS = '2083-04-16 BS';

    if (assignTargetType === 'LOCATION') {
      const locObj = locations.find((l) => l.id === assignLocationId);
      await onUpdateAssetStatus(selectedAssetForAssign.id, {
        status: 'ASSIGNED_TO_LOCATION',
        assignedType: 'LOCATION',
        assignedLocationId: assignLocationId,
        assignedLocationName: locObj?.name || assignLocationId,
        assignmentDateAD: todayAD,
        assignmentDateBS: todayBS,
        assignmentNotes: assignNotes,
      });
    } else {
      const custObj = customers.find((c) => c.id === assignCustomerId);
      await onUpdateAssetStatus(selectedAssetForAssign.id, {
        status: 'ASSIGNED_TO_CUSTOMER',
        assignedType: 'CUSTOMER',
        assignedCustomerId: assignCustomerId,
        assignedCustomerName: custObj ? `${custObj.customerName} (${custObj.customerId})` : assignCustomerId,
        assignmentDateAD: todayAD,
        assignmentDateBS: todayBS,
        assignmentNotes: assignNotes,
      });
    }

    setIsAssignModalOpen(false);
    setSelectedAssetForAssign(null);
  };

  const handleUnassignAsset = async (asset: Asset) => {
    if (!onUpdateAssetStatus) return;
    if (confirm(`Unassign "${asset.name}" (${asset.tagNumber}) and return it to Available Stock?`)) {
      await onUpdateAssetStatus(asset.id, {
        status: 'ACTIVE',
        assignedType: undefined,
        assignedLocationId: undefined,
        assignedLocationName: undefined,
        assignedCustomerId: undefined,
        assignedCustomerName: undefined,
        assignmentDateAD: undefined,
        assignmentDateBS: undefined,
        assignmentNotes: undefined,
      });
    }
  };

  // 6. Submit Consumable Issue to Technician / Work Order Field Usage
  const handleSubmitConsumableIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === consumableProductId);
    const branchObj = branches.find((b) => b.id === consumableBranchId);

    if (!prod) {
      alert('Please select a valid consumable product.');
      return;
    }

    const qtyToIssue = Math.abs(Number(consumableQty));
    if (qtyToIssue <= 0) {
      alert('Please enter a valid quantity to issue.');
      return;
    }

    const totalVal = qtyToIssue * prod.costPrice;

    await onCreateOperation({
      type: 'CONSUMABLE_ISSUE',
      branchId: consumableBranchId,
      branchName: branchObj?.name,
      productId: prod.id,
      productName: prod.name,
      quantityChanged: -qtyToIssue,
      costPerUnit: prod.costPrice,
      totalValue: totalVal,
      technicianName: consumableTechnician,
      workOrderRef: consumableWorkOrder,
      reason: `Consumable Field Issue: WO ${consumableWorkOrder} (${consumableTechnician}) - ${consumableReason}`,
      inspectorName: currentUser?.name || 'Store Supervisor',
      status: 'LOGGED',
    });

    alert(`Successfully issued ${qtyToIssue} ${prod.unit} of ${prod.name} to Technician ${consumableTechnician} for Work Order ${consumableWorkOrder}!`);
    setConsumableQty(5);
    setConsumableReason('Field fiber splicing & customer drop installation material usage');
  };

  // 5. Submit Product Sale to Customer
  const handleSubmitProductSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === saleProductId);
    const cust = customers.find((c) => c.id === saleCustomerId);
    const branchObj = branches.find((b) => b.id === saleBranchId);

    if (!prod || !cust) return;

    const totalSaleAmount = (Number(saleQty) * Number(salePrice)) - Number(saleDiscount);

    await onCreateOperation({
      type: 'STOCK_OUT',
      branchId: saleBranchId,
      branchName: branchObj?.name,
      productId: saleProductId,
      productName: prod.name,
      quantityChanged: -Math.abs(Number(saleQty)),
      costPerUnit: prod.costPrice,
      sellingUnitPrice: Number(salePrice),
      totalValue: totalSaleAmount,
      customerId: cust.id,
      customerName: `${cust.customerName} (${cust.customerId})`,
      paymentMethod: salePaymentMethod,
      reason: `Customer Product Sale: ${cust.customerName} - ${saleNotes}`,
      inspectorName: currentUser?.name || 'Sales Representative',
      status: 'LOGGED',
    });

    alert(`Product Sale logged successfully! Total Bill Amount: रु ${totalSaleAmount.toLocaleString('en-IN')}`);
  };

  // Helper to check if an operation belongs to user's allowed branches
  const isOpInAllowedBranch = (op: StockOperation) => {
    if (canSeeAll) return true;
    return (
      (op.branchId && allowedBranchIds.includes(op.branchId)) ||
      (op.destinationWarehouseId && allowedBranchIds.includes(op.destinationWarehouseId))
    );
  };

  // Filters for Stock Operations Logs
  const filteredOperations = operations.filter((op) => {
    if (!isOpInAllowedBranch(op)) return false;

    const matchesBranch =
      branchFilter === 'ALL'
        ? true
        : op.branchId === branchFilter || op.destinationWarehouseId === branchFilter;

    if (!matchesBranch) return false;

    if (activeTab === 'PULLOUT_BINS') return op.type === 'PULLOUT';
    if (activeTab === 'DAMAGE_TRACKING') return op.type === 'DAMAGE';
    if (activeTab === 'CONSUMABLE_ISSUE') return op.type === 'CONSUMABLE_ISSUE';
    if (activeTab === 'PRODUCT_SALE') return op.type === 'STOCK_OUT';
    return true;
  });

  const pulloutOperations = operations.filter((op) => op.type === 'PULLOUT' && isOpInAllowedBranch(op));
  const damageOperations = operations.filter((op) => op.type === 'DAMAGE' && isOpInAllowedBranch(op));
  const consumableOperations = operations.filter((op) => op.type === 'CONSUMABLE_ISSUE' && isOpInAllowedBranch(op));
  const saleOperations = operations.filter((op) => op.type === 'STOCK_OUT' && isOpInAllowedBranch(op));

  // Available vs Assigned Fixed Assets
  const availableStockAssets = assets.filter(
    (a) => a.status === 'ACTIVE' && (!a.assignedType || a.status !== 'ASSIGNED_TO_LOCATION' && a.status !== 'ASSIGNED_TO_CUSTOMER')
  );
  const assignedAssets = assets.filter(
    (a) => a.status === 'ASSIGNED_TO_LOCATION' || a.status === 'ASSIGNED_TO_CUSTOMER' || Boolean(a.assignedType)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <AlertOctagon className="h-5 w-5 text-indigo-500" />
            <span>Stock Operations & Logistics Center</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Manage overstock pullouts, branch damage labeling, inter-branch transfers, fixed asset site assignments, and customer product sales.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsDamageModalOpen(true)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Label Damaged Stock</span>
          </button>

          <button
            onClick={() => setIsPulloutModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Pullout Bin</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={`flex items-center gap-1 border-b pb-1 overflow-x-auto ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {(() => {
          const canPullout = isOperationAllowed('branch-pullout-dispatch', currentUser?.role);
          return (
            <button
              disabled={!canPullout}
              title={!canPullout ? 'Pullout dispatch is disabled for your role permissions' : 'Warehouse pullout dispatch'}
              onClick={() => {
                if (!canPullout) {
                  alert('Pullout dispatch operation is disabled for your role permissions.');
                  return;
                }
                setActiveTab('PULLOUT_BINS');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                !canPullout
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'PULLOUT_BINS'
                  ? 'bg-indigo-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              {!canPullout ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Truck className="h-4 w-4" />}
              <span>1. Warehouse Pullout ({pulloutOperations.length})</span>
            </button>
          );
        })()}

        {(() => {
          const canDamage = isOperationAllowed('branch-damage-mark', currentUser?.role);
          return (
            <button
              disabled={!canDamage}
              title={!canDamage ? 'Damaged stock registration is disabled for your role permissions' : 'Damaged stock log'}
              onClick={() => {
                if (!canDamage) {
                  alert('Damaged stock registration operation is disabled for your role permissions.');
                  return;
                }
                setActiveTab('DAMAGE_TRACKING');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                !canDamage
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'DAMAGE_TRACKING'
                  ? 'bg-rose-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              {!canDamage ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <AlertTriangle className="h-4 w-4" />}
              <span>2. Damaged Stock ({damageOperations.length})</span>
            </button>
          );
        })()}

        {(() => {
          const canReceive = isOperationAllowed('branch-transfer-receive', currentUser?.role);
          return (
            <button
              disabled={!canReceive}
              title={!canReceive ? 'Transfer receiving is disabled for your role permissions' : 'Receive incoming transfer shipments'}
              onClick={() => {
                if (!canReceive) {
                  alert('Transfer receiving operation is disabled for your role permissions.');
                  return;
                }
                setActiveTab('RECEIVE_TRANSFER');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                !canReceive
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'RECEIVE_TRANSFER'
                  ? 'bg-amber-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              {!canReceive ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Inbox className="h-4 w-4" />}
              <span>3. Receive Transfer ({shipments.length})</span>
            </button>
          );
        })()}

        {(() => {
          const canCreateXfer = isOperationAllowed('branch-transfer-create', currentUser?.role);
          return (
            <button
              disabled={!canCreateXfer}
              title={!canCreateXfer ? 'Inter-branch transfer creation is disabled for your role permissions' : 'Create inter-branch stock transfer'}
              onClick={() => {
                if (!canCreateXfer) {
                  alert('Stock transfer creation operation is disabled for your role permissions.');
                  return;
                }
                setActiveTab('CREATE_TRANSFER');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                !canCreateXfer
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'CREATE_TRANSFER'
                  ? 'bg-sky-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              {!canCreateXfer ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Send className="h-4 w-4" />}
              <span>4. Create Transfer</span>
            </button>
          );
        })()}

        {(() => {
          const canAssignAsset = isOperationAllowed('branch-asset-assign', currentUser?.role);
          return (
            <button
              disabled={!canAssignAsset}
              title={!canAssignAsset ? 'Fixed asset commissioning is disabled for your role permissions' : 'Assign fixed asset to location/customer'}
              onClick={() => {
                if (!canAssignAsset) {
                  alert('Fixed asset assignment operation is disabled for your role permissions.');
                  return;
                }
                setActiveTab('ASSIGN_ASSET');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                !canAssignAsset
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'ASSIGN_ASSET'
                  ? 'bg-emerald-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              {!canAssignAsset ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Wrench className="h-4 w-4" />}
              <span>5. Assign Fixed Asset ({availableStockAssets.length} Avail)</span>
            </button>
          );
        })()}

        {(() => {
          return (
            <button
              title="Issue Consumables (Splitters, Protection Sleeves, Couplers, Fast Connectors) to Field Technicians"
              onClick={() => setActiveTab('CONSUMABLE_ISSUE')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'CONSUMABLE_ISSUE'
                  ? 'bg-amber-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              <Wrench className="h-4 w-4 text-amber-300" />
              <span>6. Issue Consumables ({consumableOperations.length})</span>
            </button>
          );
        })()}

        {(() => {
          const canSale = isOperationAllowed('stock-out', currentUser?.role);
          return (
            <button
              disabled={!canSale}
              title={!canSale ? 'Product sales operation is disabled for your role permissions' : 'Direct retail product item sale'}
              onClick={() => {
                if (!canSale) {
                  alert('Product sale operation is disabled for your role permissions.');
                  return;
                }
                setActiveTab('PRODUCT_SALE');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                !canSale
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'PRODUCT_SALE'
                  ? 'bg-purple-600 text-white shadow-sm cursor-pointer'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              }`}
            >
              {!canSale ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <PackageMinus className="h-4 w-4" />}
              <span>7. Product Sale ({saleOperations.length})</span>
            </button>
          );
        })()}

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'LOGS'
              ? 'bg-slate-700 text-white shadow-sm'
              : isDarkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Logs ({operations.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PULLOUT BINS (Warehouse Return) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PULLOUT_BINS' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Truck className="h-4 w-4 text-indigo-500" />
                <span>Overstock & Damaged Stock Warehouse Pullout Dispatches</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredOperations.length} dispatches
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOperations.map((op) => (
                <div
                  key={op.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {op.referenceNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/30">
                        {op.status || 'DISPATCHED'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Source: {op.branchName || op.branchId} → Warehouse: {op.destinationWarehouseName || 'Central Hub'}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{op.reason}</p>

                    {op.items && op.items.length > 0 && (
                      <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <span className="font-bold">Contents: </span>
                        {op.items.map((i) => `${i.productName} (${i.quantity} ${i.unit || 'pcs'} - ${i.condition})`).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 font-mono text-[11px]">{op.dateAD}</span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      रु {op.totalValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DAMAGED STOCK LABELING & TRACKING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'DAMAGE_TRACKING' && (
        <div className="space-y-4">
          {!isSuperOrInventory && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-2.5 text-xs font-medium">
              <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span>
                <strong>Branch Role Restriction Active:</strong> As a branch user, you can label damaged stock exclusively for your assigned branch stock. Super Admins and Inventory Controllers can manage damage across all branches.
              </span>
            </div>
          )}

          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span>Locally Tagged Damaged Stock Logs</span>
              </h3>
              <button
                onClick={() => setIsDamageModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Label New Damaged Item</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase text-[9px] tracking-wider border-b ${
                  isDarkMode ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-2.5">Reference #</th>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Qty Damaged</th>
                    <th className="p-2.5">Estimated Cost</th>
                    <th className="p-2.5">Damage Reason</th>
                    <th className="p-2.5">Inspector</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {filteredOperations.map((op) => (
                    <tr key={op.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">{op.referenceNumber}</td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{op.branchId}</td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">{op.productName}</td>
                      <td className="p-2.5 font-mono font-bold text-rose-600">{Math.abs(op.quantityChanged || 1)} Pcs</td>
                      <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">रु {op.totalValue.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-slate-500">{op.reason}</td>
                      <td className="p-2.5 font-medium text-slate-600 dark:text-slate-400">{op.inspectorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: RECEIVE TRANSFER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'RECEIVE_TRANSFER' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Inbox className="h-4 w-4 text-amber-500" />
                <span>Inter-Branch Transfer Dispatches & Incoming Stock</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Filter Branch:</span>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className={`rounded-xl border px-3 py-1 text-xs font-medium focus:outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {canSeeAll ? (
                    <option value="ALL">All Branches</option>
                  ) : allowedBranches.length > 1 ? (
                    <option value="ALL">All Assigned Branches ({allowedBranches.length})</option>
                  ) : null}
                  {allowedBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shipments
                .filter((sh) => branchFilter === 'ALL' || sh.destinationBranchId === branchFilter || sh.sourceBranchId === branchFilter)
                .map((sh) => (
                  <div
                    key={sh.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                      isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {sh.trackingCode}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          sh.status === 'RECEIVED' || sh.status === 'DELIVERED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300'
                        }`}>
                          {sh.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-1">
                        <span>{sh.sourceBranchName || sh.sourceBranchId}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span>{sh.destinationBranchName || sh.destinationBranchId}</span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/50">
                        <span className="font-bold">Transfer Items: </span>
                        {sh.items?.map((i) => `${i.productName} (${i.quantity} ${i.unit || 'pcs'})`).join(', ')}
                      </div>

                      {sh.notes && <p className="text-[11px] text-slate-400 mt-1 italic">{sh.notes}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400">Dispatch Date: {sh.dispatchDateAD}</span>

                      {sh.status !== 'RECEIVED' && sh.status !== 'DELIVERED' && onReceiveShipment ? (
                        <button
                          onClick={() => onReceiveShipment(sh.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm & Receive Stock</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Stock Received</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: CREATE TRANSFER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'CREATE_TRANSFER' && (
        <div className={`p-6 rounded-2xl border max-w-2xl mx-auto shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <h3 className="text-base font-serif font-bold flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Send className="h-5 w-5 text-sky-500" />
            <span>Create Inter-Branch Stock Transfer</span>
          </h3>

          <form onSubmit={handleSubmitCreateTransfer} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Source Dispatch Branch *</label>
                <select
                  value={xferSourceBranchId}
                  onChange={(e) => setXferSourceBranchId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {allowedBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Destination Receiving Branch *</label>
                <select
                  value={xferDestBranchId}
                  onChange={(e) => setXferDestBranchId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {branches
                    .filter((b) => b.id !== xferSourceBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Select Product to Transfer *</label>
              <select
                value={xferProductId}
                onChange={(e) => setXferProductId(e.target.value)}
                className={`w-full rounded-xl border p-2.5 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              >
                {products.map((p) => {
                  const srcStock = stock.find((s) => s.productId === p.id && s.branchId === xferSourceBranchId);
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Available: {srcStock?.quantityOnHand || 0} {p.unit})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1">Transfer Quantity *</label>
              <input
                type="number"
                min={1}
                required
                value={xferQty}
                onChange={(e) => setXferQty(Number(e.target.value))}
                className={`w-full rounded-xl border p-2.5 font-mono ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Dispatch Notes / Courier Reference</label>
              <textarea
                rows={2}
                value={xferNotes}
                onChange={(e) => setXferNotes(e.target.value)}
                className={`w-full rounded-xl border p-2.5 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Dispatch Transfer Shipment</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: ASSIGN FIXED ASSET (Locations & Customer Sites) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ASSIGN_ASSET' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-500 flex-shrink-0" />
              <span>
                <strong>Fixed Asset Location & Customer Assignment:</strong> Fixed Assets deployed in POP Server Rooms, Fiber Network Nodes, or Customer Sites are assigned directly to their operational location and removed from available unassigned stock.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Available Fixed Assets in Stock */}
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`font-bold text-sm mb-3 flex items-center justify-between ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  <span>Available Fixed Assets in Stock ({availableStockAssets.length})</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">Unassigned</span>
              </h3>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {availableStockAssets.length === 0 ? (
                  <p className="text-xs text-slate-400 p-6 text-center">No unassigned fixed assets available in stock.</p>
                ) : (
                  availableStockAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                          Tag: {asset.tagNumber}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{asset.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Cost: रु {asset.acquisitionCost.toLocaleString('en-IN')} | Category: {asset.category}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenAssignModal(asset)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-xs cursor-pointer flex-shrink-0"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Assign Asset</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Assigned Fixed Assets Register */}
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`font-bold text-sm mb-3 flex items-center justify-between ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  <span>Assigned & Deployed Fixed Assets ({assignedAssets.length})</span>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">In-Use / Installed</span>
              </h3>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {assignedAssets.length === 0 ? (
                  <p className="text-xs text-slate-400 p-6 text-center">No assigned assets logged yet.</p>
                ) : (
                  assignedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                            Tag: {asset.tagNumber}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{asset.name}</h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/30">
                          {asset.assignedType === 'LOCATION' ? 'POP / Node Site' : 'Customer Site'}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 text-xs space-y-0.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-indigo-500" />
                          <span>
                            {asset.assignedType === 'LOCATION'
                              ? asset.assignedLocationName || asset.assignedLocationId
                              : asset.assignedCustomerName || asset.assignedCustomerId}
                          </span>
                        </div>
                        {asset.assignmentNotes && (
                          <div className="text-[10px] text-slate-400 italic">{asset.assignmentNotes}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-slate-400 font-mono">Assigned: {asset.assignmentDateAD || '2026-08-01'}</span>
                        <button
                          onClick={() => handleUnassignAsset(asset)}
                          className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                        >
                          Unassign / Return to Stock
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: CONSUMABLE ISSUE TO TECHNICIAN / FIELD USAGE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'CONSUMABLE_ISSUE' && (
        <div className={`p-6 rounded-2xl border max-w-2xl mx-auto shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-serif font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              <span>Issue Consumable Items (Splitter, Sleeve, Coupler, Fast Connector)</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              Quantity-Only Store Usage
            </span>
          </div>

          <form onSubmit={handleSubmitConsumableIssue} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
              <strong>Consumables Operational Rule:</strong> Field materials (Splitters, Protection Sleeves, Couplers, Fast Connectors, Patch Cords, Drop Clamps) do NOT carry individual serial numbers or depreciation schedules. Issuing deducts store stock directly and logs the assigned field technician and work order ticket.
            </div>

            {/* Current Available Stock Banner */}
            {(() => {
              const currentStockItem = stock.find(
                (s) => s.productId === consumableProductId && s.branchId === consumableBranchId
              );
              const availQty = currentStockItem?.quantityOnHand || 0;
              const selProd = products.find((p) => p.id === consumableProductId);

              return (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    availQty > 0
                      ? isDarkMode
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : isDarkMode
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>
                      Current Store Stock ({branches.find((b) => b.id === consumableBranchId)?.name}):
                    </span>
                  </div>
                  <div className="font-mono font-bold text-sm">
                    {availQty} {selProd?.unit || 'Pcs'} Available
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Source Store Branch *</label>
                <select
                  value={consumableBranchId}
                  onChange={(e) => setConsumableBranchId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {allowedBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Select Consumable Material *</label>
                <select
                  value={consumableProductId}
                  onChange={(e) => setConsumableProductId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 font-medium ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {products.map((p) => {
                    const groupLabel = p.productGroup || 'Product Item';
                    return (
                      <option key={p.id} value={p.id}>
                        [{groupLabel}] {p.sku} - {p.name} ({p.unit})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Quantity to Issue *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={consumableQty}
                  onChange={(e) => setConsumableQty(Number(e.target.value))}
                  className={`w-full rounded-xl border p-2.5 font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Field Technician Name *</label>
                <input
                  type="text"
                  required
                  value={consumableTechnician}
                  onChange={(e) => setConsumableTechnician(e.target.value)}
                  placeholder="e.g. Ram Bahadur (Splicing Tech)"
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Work Order / Ticket Ref *</label>
                <input
                  type="text"
                  required
                  value={consumableWorkOrder}
                  onChange={(e) => setConsumableWorkOrder(e.target.value)}
                  placeholder="e.g. WO-2081-SPLIT-04"
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Field Usage Description / Notes</label>
              <textarea
                rows={2}
                value={consumableReason}
                onChange={(e) => setConsumableReason(e.target.value)}
                placeholder="Reason or site location for material issue..."
                className={`w-full rounded-xl border p-2.5 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              <span>Record Consumable Issue & Deduct Stock</span>
            </button>
          </form>

          {/* Table of Issued Consumables */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4 text-amber-500" />
              <span>Logged Consumable Field Issues ({consumableOperations.length})</span>
            </h4>

            {consumableOperations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3">No consumable field issues recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                    isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Ref / WO</th>
                      <th className="p-2.5">Branch</th>
                      <th className="p-2.5">Consumable Material</th>
                      <th className="p-2.5 text-center">Qty Issued</th>
                      <th className="p-2.5">Technician</th>
                      <th className="p-2.5 text-right">Value (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {consumableOperations.map((op) => (
                      <tr key={op.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-2.5 font-mono text-slate-400 text-[11px]">{op.dateAD}</td>
                        <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">{op.workOrderRef || op.referenceNumber}</td>
                        <td className="p-2.5 font-medium">{op.branchName || op.branchId}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{op.productName}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-600">
                          {Math.abs(op.quantityChanged || 0)} Pcs
                        </td>
                        <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">{op.technicianName || 'N/A'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          रु {op.totalValue?.toLocaleString('en-IN') || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: PRODUCT SALE TO CUSTOMER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PRODUCT_SALE' && (
        <div className={`p-6 rounded-2xl border max-w-2xl mx-auto shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <h3 className="text-base font-serif font-bold flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <PackageMinus className="h-5 w-5 text-purple-500" />
            <span>Product Sale to Customer (Stock Out)</span>
          </h3>

          <form onSubmit={handleSubmitProductSale} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Select Customer *</label>
                <select
                  value={saleCustomerId}
                  onChange={(e) => setSaleCustomerId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName} ({c.customerId}) - {c.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Fulfilling Branch *</label>
                <select
                  value={saleBranchId}
                  onChange={(e) => setSaleBranchId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {allowedBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Product Item *</label>
              <select
                value={saleProductId}
                onChange={(e) => {
                  setSaleProductId(e.target.value);
                  const p = products.find((pr) => pr.id === e.target.value);
                  if (p) setSalePrice(p.sellingPrice);
                }}
                className={`w-full rounded-xl border p-2.5 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              >
                {products.map((p) => {
                  const stk = stock.find((s) => s.productId === p.id && s.branchId === saleBranchId);
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Stock: {stk?.quantityOnHand || 0} {p.unit} | Cost: रु {p.costPrice})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Sale Quantity *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={saleQty}
                  onChange={(e) => setSaleQty(Number(e.target.value))}
                  className={`w-full rounded-xl border p-2.5 font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Selling Price / Unit (रु) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className={`w-full rounded-xl border p-2.5 font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Discount (रु)</label>
                <input
                  type="number"
                  min={0}
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(Number(e.target.value))}
                  className={`w-full rounded-xl border p-2.5 font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Payment Method</label>
                <select
                  value={salePaymentMethod}
                  onChange={(e) => setSalePaymentMethod(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="Cash / Direct Payment">Cash / Direct Payment</option>
                  <option value="eSewa / Khalti Digital Mobile Wallet">eSewa / Khalti Digital Mobile Wallet</option>
                  <option value="Bank Transfer / Fonepay QR">Bank Transfer / Fonepay QR</option>
                  <option value="Customer Account Credit">Customer Account Credit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Total Net Billing Amount</label>
                <div className="p-2.5 rounded-xl border bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                  रु {((saleQty * salePrice) - saleDiscount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Sale Notes / Remarks</label>
              <textarea
                rows={2}
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className={`w-full rounded-xl border p-2.5 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-md flex items-center gap-2 cursor-pointer"
              >
                <PackageMinus className="h-4 w-4" />
                <span>Submit Product Sale</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'LOGS' && (
        <div className={`p-4 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Audit Log of All Stock Operations ({operations.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`font-bold uppercase text-[9px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-2.5">Ref #</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Branch</th>
                  <th className="p-2.5">Product / Details</th>
                  <th className="p-2.5">Value</th>
                  <th className="p-2.5">Inspector / Officer</th>
                  <th className="p-2.5">Date</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {operations.map((op) => (
                  <tr key={op.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{op.referenceNumber}</td>
                    <td className="p-2.5 font-bold">{op.type}</td>
                    <td className="p-2.5">{op.branchId}</td>
                    <td className="p-2.5">{op.productName || op.reason}</td>
                    <td className="p-2.5 font-mono font-bold">रु {op.totalValue.toLocaleString('en-IN')}</td>
                    <td className="p-2.5">{op.inspectorName}</td>
                    <td className="p-2.5 font-mono text-slate-400">{op.dateAD}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: Create Pullout Bin */}
      {/* ============================================================ */}
      {isPulloutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden p-6 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-serif font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-500" />
                <span>Create Overstock / Damaged Stock Pullout Bin</span>
              </h3>
              <button onClick={() => setIsPulloutModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPulloutBin} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Source Branch *</label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {allowedBranches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Destination Central Warehouse *</label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Add Items to Pullout Bin</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search product SKU or name to add..."
                    value={prodSearchInput}
                    onChange={(e) => {
                      setProdSearchInput(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    className={`w-full rounded-xl border p-2.5 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                  {isSearchOpen && matchingProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl bg-white dark:bg-slate-900 divide-y dark:divide-slate-800">
                      {matchingProducts.slice(0, 6).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleAddProductToPullout(p)}
                          className="p-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                            <span className="text-[10px] text-slate-400 block">SKU: {p.sku} | Unit: {p.unit}</span>
                          </div>
                          <span className="font-mono font-bold text-indigo-600">रु {p.costPrice}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Added Pullout Items List */}
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-xl p-2">
                {pulloutItems.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 text-xs">No items added to pullout bin yet.</p>
                ) : (
                  pulloutItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <div className="flex-1">
                        <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <select
                            value={item.condition}
                            onChange={(e) => handleUpdatePulloutItem(item.id, { condition: e.target.value as any })}
                            className="text-[10px] rounded border px-1.5 py-0.5 bg-white dark:bg-slate-900"
                          >
                            <option value="OVERSTOCK">OVERSTOCK</option>
                            <option value="DAMAGED_STOCK">DAMAGED_STOCK</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdatePulloutItem(item.id, { quantity: Number(e.target.value) })}
                          className="w-16 rounded border p-1 text-center font-mono text-xs bg-white dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePulloutItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <label className="block font-bold mb-1">Dispatch Reason / Notes</label>
                <textarea
                  rows={2}
                  value={binNotes}
                  onChange={(e) => setBinNotes(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPulloutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-md cursor-pointer"
                >
                  Dispatch Pullout Bin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: Label Local Damaged Stock */}
      {/* ============================================================ */}
      {isDamageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-serif font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <span>Label Local Damaged Stock</span>
              </h3>
              <button onClick={() => setIsDamageModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDamageTag} className="space-y-4 mt-4 text-xs">
              {!isSuperOrInventory && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>Branch User Rule: Locked to your assigned branch ({currentUser?.branchId})</span>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Target Branch *</label>
                <select
                  value={damageBranchId}
                  onChange={(e) => setDamageBranchId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {allowedBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Damaged Product *</label>
                <select
                  value={damageProductId}
                  onChange={(e) => setDamageProductId(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Damaged Quantity *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={damageQty}
                  onChange={(e) => setDamageQty(Number(e.target.value))}
                  className={`w-full rounded-xl border p-2.5 font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Reason for Damage</label>
                <textarea
                  rows={2}
                  required
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Inspector / Officer Name</label>
                <input
                  type="text"
                  required
                  value={damageInspector}
                  onChange={(e) => setDamageInspector(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 shadow-md cursor-pointer"
                >
                  Save Damaged Stock Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: Assign Fixed Asset Modal */}
      {/* ============================================================ */}
      {isAssignModalOpen && selectedAssetForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-serif font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-500" />
                <span>Assign Fixed Asset: {selectedAssetForAssign.name}</span>
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAssignAsset} className="space-y-4 mt-4 text-xs">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                Tag: <strong>{selectedAssetForAssign.tagNumber}</strong> | Category: {selectedAssetForAssign.category}
              </div>

              <div>
                <label className="block font-bold mb-1">Assign Target Category *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignTargetType('LOCATION')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      assignTargetType === 'LOCATION'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-300'
                        : 'bg-slate-50 border-slate-300 text-slate-700'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>POP / Network Site</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignTargetType('CUSTOMER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      assignTargetType === 'CUSTOMER'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-300'
                        : 'bg-slate-50 border-slate-300 text-slate-700'
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Customer Home / Site</span>
                  </button>
                </div>
              </div>

              {assignTargetType === 'LOCATION' ? (
                <div>
                  <label className="block font-bold mb-1">Select POP / Network Location *</label>
                  <select
                    value={assignLocationId}
                    onChange={(e) => setAssignLocationId(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type.replace(/_/g, ' ')}) - {loc.address}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold mb-1">Select Customer *</label>
                  <select
                    value={assignCustomerId}
                    onChange={(e) => setAssignCustomerId(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerName} ({c.customerId}) - {c.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Installation / Assignment Remarks</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-md cursor-pointer"
                >
                  Confirm Asset Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
