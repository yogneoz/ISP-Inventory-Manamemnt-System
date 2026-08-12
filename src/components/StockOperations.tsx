import React, { useState, useEffect } from 'react';
import {
  StockOperation,
  Product,
  Branch,
  InventoryStock,
  PulloutItem,
  ShipmentItem,
  SaleItem,
  ConsumableIssueItem,
  DeviceSerialPair,
  User,
  Shipment,
  Asset,
  LocationRecord,
  CustomerRecord,
  CustomerDeviceRecord,
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
  RotateCcw,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { isOperationAllowed, canUserSeeAllBranches, getAllowedBranches, getAllowedBranchIds } from '../utils/permissions';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductSearchBar } from './ProductSearchBar';

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
  customerDevices?: CustomerDeviceRecord[];
  onCreateOperation: (op: Partial<StockOperation>) => Promise<void>;
  onReceiveOperation?: (id: string) => Promise<void>;
  onCreateShipment?: (sh: Partial<Shipment>) => Promise<void>;
  onReceiveShipment?: (
    id: string,
    verificationData?: {
      receivedItems?: {
        itemId: string;
        quantityReceived: number;
        receivedSerials?: { deviceSerial: string; ponSerial?: string }[];
        itemDiscrepancyNotes?: string;
      }[];
      receivedByNotes?: string;
    }
  ) => Promise<void>;
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
  customerDevices = [],
  onCreateOperation,
  onReceiveOperation,
  onCreateShipment,
  onReceiveShipment,
  onUpdateAssetStatus,
}) => {
  // Determine role permissions for Damage Labeling & Stock Control
  const isSuperOrInventory =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'INVENTORY_MANAGER' ||
    (currentUser?.role as string) === 'INVENTORY_CONTROLLER';

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

  // Filter Central Warehouse & Warehouse locations for pullouts (exclude standard retail branches)
  const warehouseLocations = branches.filter(
    (b) =>
      b.isHeadquarters ||
      b.isWarehouse ||
      b.code.toUpperCase().startsWith('WH') ||
      b.name.toLowerCase().includes('warehouse') ||
      b.name.toLowerCase().includes('head office') ||
      b.name.toLowerCase().includes('central')
  );
  const destWarehouseOptions = warehouseLocations.length > 0 ? warehouseLocations : branches.filter((b) => b.isHeadquarters);

  // Filter source branches for pullouts: ONLY retail / store branches (exclude Head Office / WH001 / warehouses)
  const pulloutSourceBranches = allowedBranches.filter(
    (b) =>
      !b.isHeadquarters &&
      !b.isWarehouse &&
      b.id !== 'WH001' &&
      !b.code.toUpperCase().startsWith('WH') &&
      !b.name.toLowerCase().includes('head office') &&
      !b.name.toLowerCase().includes('central warehouse')
  );
  const effectivePulloutSourceBranches =
    pulloutSourceBranches.length > 0
      ? pulloutSourceBranches
      : allowedBranches.filter((b) => b.id !== 'WH001');

  // 1. Pullout Bin Form State
  const userBranchId = allowedBranches[0]?.id || branches[0]?.id || '';
  const initialPulloutSourceBranchId =
    effectivePulloutSourceBranches.find((b) => b.id === userBranchId)?.id ||
    effectivePulloutSourceBranches[0]?.id ||
    allowedBranches.find((b) => b.id !== 'WH001')?.id ||
    'BRC01';

  const [sourceBranchId, setSourceBranchId] = useState<string>(initialPulloutSourceBranchId);
  const [destWarehouseId, setDestWarehouseId] = useState<string>(
    destWarehouseOptions[0]?.id || branches.find((b) => b.isHeadquarters)?.id || 'WH001'
  );

  useEffect(() => {
    if (effectivePulloutSourceBranches.length > 0) {
      if (!effectivePulloutSourceBranches.some((b) => b.id === sourceBranchId)) {
        setSourceBranchId(effectivePulloutSourceBranches[0].id);
      }
    }
  }, [effectivePulloutSourceBranches, sourceBranchId]);
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

  // 3. Create Transfer Form State (Multi-Item Shipment Dispatch)
  const [xferSourceBranchId, setXferSourceBranchId] = useState<string>(userBranchId);
  const [xferDestBranchId, setXferDestBranchId] = useState<string>(
    branches.find((b) => b.id !== userBranchId)?.id || branches[1]?.id || ''
  );
  const [xferNotes, setXferNotes] = useState<string>('Inter-branch inventory transfer dispatch');
  const [transferItems, setTransferItems] = useState<ShipmentItem[]>([]);

  // 4. Assign Fixed Asset Form State
  const [assignTargetType, setAssignTargetType] = useState<'LOCATION' | 'CUSTOMER'>('LOCATION');
  const [assignLocationId, setAssignLocationId] = useState<string>(locations[0]?.id || '');
  const [assignCustomerId, setAssignCustomerId] = useState<string>(customers[0]?.id || '');
  const [assignNotes, setAssignNotes] = useState<string>('Installed & commissioned as operational fixed asset');

  // 5. Product Sale Form State (Multi-Item Sales Invoice)
  const [saleCustomerId, setSaleCustomerId] = useState<string>(customers[0]?.id || '');
  const [saleBranchId, setSaleBranchId] = useState<string>(userBranchId);
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>('Cash / Direct Payment');
  const [saleNotes, setSaleNotes] = useState<string>('Direct retail product item sale to customer');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // 6. Consumable Issue Form State (Multi-Item Requisition)
  const [consumableBranchId, setConsumableBranchId] = useState<string>(userBranchId);
  const [consumableTechnician, setConsumableTechnician] = useState<string>('Field Splicing Technician');
  const [consumableWorkOrder, setConsumableWorkOrder] = useState<string>('WO-2081-SPLIT-01');
  const [consumableReason, setConsumableReason] = useState<string>('Field fiber splicing & customer drop installation material usage');
  const [consumableItems, setConsumableItems] = useState<ConsumableIssueItem[]>([]);

  // 7. Receive Stock Physical Verification Modal State
  const [receivingShipmentModal, setReceivingShipmentModal] = useState<Shipment | null>(null);
  const [receiveItemStates, setReceiveItemStates] = useState<{
    [itemId: string]: {
      quantityReceived: number;
      verifiedSerials: { deviceSerial: string; ponSerial?: string; isChecked: boolean }[];
      notes: string;
    };
  }>({});
  const [receivingByNotes, setReceivingByNotes] = useState<string>('');

  const openReceiveModal = (sh: Shipment) => {
    setReceivingShipmentModal(sh);
    setReceivingByNotes('');
    const initialStates: any = {};
    sh.items?.forEach((item) => {
      initialStates[item.id] = {
        quantityReceived: item.quantityReceived !== undefined ? item.quantityReceived : (item.quantitySent || (item as any).quantity || 1),
        verifiedSerials: (item.deviceSerials || []).map((s) => ({
          deviceSerial: s.deviceSerial,
          ponSerial: s.ponSerial || '',
          isChecked: true,
        })),
        notes: item.itemDiscrepancyNotes || '',
      };
    });
    setReceiveItemStates(initialStates);
  };

  const updateReceiveQty = (itemId: string, qty: number) => {
    setReceiveItemStates((prev) => {
      const curr = prev[itemId] || { quantityReceived: 1, verifiedSerials: [], notes: '' };
      return {
        ...prev,
        [itemId]: {
          ...curr,
          quantityReceived: Math.max(0, qty),
        },
      };
    });
  };

  const toggleSerialCheck = (itemId: string, sIdx: number) => {
    setReceiveItemStates((prev) => {
      const curr = prev[itemId];
      if (!curr) return prev;
      const updatedSerials = [...curr.verifiedSerials];
      updatedSerials[sIdx] = {
        ...updatedSerials[sIdx],
        isChecked: !updatedSerials[sIdx].isChecked,
      };
      return {
        ...prev,
        [itemId]: {
          ...curr,
          verifiedSerials: updatedSerials,
        },
      };
    });
  };

  const updateItemDiscrepancyNotes = (itemId: string, notes: string) => {
    setReceiveItemStates((prev) => {
      const curr = prev[itemId] || { quantityReceived: 1, verifiedSerials: [], notes: '' };
      return {
        ...prev,
        [itemId]: {
          ...curr,
          notes,
        },
      };
    });
  };

  const handleConfirmReceiveVerification = async () => {
    if (!receivingShipmentModal || !onReceiveShipment) return;

    const payloadItems = receivingShipmentModal.items.map((item) => {
      const st = receiveItemStates[item.id];
      const qty = st ? Number(st.quantityReceived) : (item.quantitySent || (item as any).quantity || 1);
      const receivedSerials = st
        ? st.verifiedSerials.filter((s) => s.isChecked).map((s) => ({ deviceSerial: s.deviceSerial, ponSerial: s.ponSerial }))
        : item.deviceSerials || [];

      return {
        itemId: item.id,
        quantityReceived: qty,
        receivedSerials,
        itemDiscrepancyNotes: st?.notes || '',
      };
    });

    await onReceiveShipment(receivingShipmentModal.id, {
      receivedItems: payloadItems,
      receivedByNotes: receivingByNotes,
    });

    setReceivingShipmentModal(null);
  };

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

  // Helper to focus element by ID safely
  const focusInput = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.focus();
        if ('select' in el) el.select();
      }
    }, 60);
  };

  // Pullout Item Handlers
  const handleAddProductToPullout = (prod: Product) => {
    const isSerialized = prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY';
    let targetLineIdx = 0;
    let targetSerialIdx = 0;

    const existingIdx = pulloutItems.findIndex((i) => i.productId === prod.id);
    if (existingIdx !== -1) {
      targetLineIdx = existingIdx;
      setPulloutItems((prev) =>
        prev.map((i, idx) => {
          if (idx !== existingIdx) return i;
          const newQty = i.quantity + 1;
          const currentSerials = [...(i.deviceSerials || [])];
          targetSerialIdx = currentSerials.length;
          if (isSerialized) {
            currentSerials.push({ deviceSerial: '', ponSerial: '' });
          }
          return {
            ...i,
            quantity: newQty,
            totalValue: newQty * i.unitCost,
            deviceSerials: isSerialized ? currentSerials : undefined,
          };
        })
      );
    } else {
      targetLineIdx = pulloutItems.length;
      targetSerialIdx = 0;
      const srcStock = stock.find((s) => s.productId === prod.id && s.branchId === sourceBranchId);
      const availDamaged = srcStock?.damagedQty || 0;
      const defaultCond = availDamaged > 0 ? 'DAMAGED_STOCK' : 'OVERSTOCK';

      setPulloutItems((prev) => [
        ...prev,
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
          deviceSerials: isSerialized ? [{ deviceSerial: '', ponSerial: '' }] : undefined,
        },
      ]);
    }
    setProdSearchInput('');
    setIsSearchOpen(false);

    if (isSerialized) {
      focusInput(`pullout-serial-device-${targetLineIdx}-${targetSerialIdx}`);
    }
  };

  const updatePulloutDeviceSerial = (lineIdx: number, sIdx: number, val: string) => {
    setPulloutItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== lineIdx) return item;
        const serials = [...(item.deviceSerials || [])];
        serials[sIdx] = { ...serials[sIdx], deviceSerial: val };
        return { ...item, deviceSerials: serials };
      })
    );
  };

  const updatePulloutPonSerial = (lineIdx: number, sIdx: number, val: string) => {
    setPulloutItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== lineIdx) return item;
        const serials = [...(item.deviceSerials || [])];
        serials[sIdx] = { ...serials[sIdx], ponSerial: val };
        return { ...item, deviceSerials: serials };
      })
    );
  };

  const handleUpdatePulloutItem = (id: string, updates: Partial<PulloutItem>) => {
    setPulloutItems(
      pulloutItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          updated.totalValue = updated.quantity * updated.unitCost;
          // Sync serials count if quantity changed and serials exist
          const prod = products.find((p) => p.id === updated.productId);
          if (prod && prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY') {
            const curSerials = [...(updated.deviceSerials || [])];
            while (curSerials.length < updated.quantity) {
              curSerials.push({ deviceSerial: '', ponSerial: '' });
            }
            updated.deviceSerials = curSerials.slice(0, updated.quantity);
          }
        }
        return updated;
      })
    );
  };

  const handleRemovePulloutItem = (id: string) => {
    setPulloutItems(pulloutItems.filter((i) => i.id !== id));
  };

  // Transfer Items Handlers
  const handleResetTransferForm = () => {
    setTransferItems([]);
    setXferNotes('Inter-branch inventory transfer dispatch');
    setXferSourceBranchId(userBranchId);
    setXferDestBranchId(branches.find((b) => b.id !== userBranchId)?.id || branches[1]?.id || '');
  };

  const updateTransferDeviceSerial = (lineIdx: number, sIdx: number, val: string) => {
    setTransferItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== lineIdx) return item;
        const serials = [...(item.deviceSerials || [])];
        serials[sIdx] = { ...serials[sIdx], deviceSerial: val };
        return { ...item, deviceSerials: serials };
      })
    );
  };

  const updateTransferPonSerial = (lineIdx: number, sIdx: number, val: string) => {
    setTransferItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== lineIdx) return item;
        const serials = [...(item.deviceSerials || [])];
        serials[sIdx] = { ...serials[sIdx], ponSerial: val };
        return { ...item, deviceSerials: serials };
      })
    );
  };

  const handleAddTransferItem = (prodId?: string) => {
    const selProd = products.find((p) => p.id === prodId) || products[0];
    if (!selProd) return;

    const isSerialized = selProd.requiresSerialTracking !== false && selProd.trackingType !== 'QUANTITY_ONLY';
    let targetLineIdx = 0;
    let targetSerialIdx = 0;

    const existingIdx = transferItems.findIndex((i) => i.productId === selProd.id);
    if (existingIdx !== -1) {
      targetLineIdx = existingIdx;
      setTransferItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const newQty = item.quantitySent + 1;
          const currentSerials = [...(item.deviceSerials || [])];
          targetSerialIdx = currentSerials.length;
          if (isSerialized) {
            currentSerials.push({ deviceSerial: '', ponSerial: '' });
          }
          return {
            ...item,
            quantity: newQty,
            quantitySent: newQty,
            deviceSerials: isSerialized ? currentSerials : undefined,
          };
        })
      );
    } else {
      targetLineIdx = transferItems.length;
      targetSerialIdx = 0;
      setTransferItems((prev) => [
        ...prev,
        {
          id: `xfer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: selProd.id,
          productName: selProd.name,
          sku: selProd.sku,
          unit: selProd.unit,
          quantity: 1,
          quantitySent: 1,
          deviceSerials: isSerialized ? [{ deviceSerial: '', ponSerial: '' }] : undefined,
        },
      ]);
    }

    if (isSerialized) {
      focusInput(`transfer-serial-device-${targetLineIdx}-${targetSerialIdx}`);
    }
  };

  const handleUpdateTransferItem = (id: string, updates: Partial<ShipmentItem>) => {
    setTransferItems(
      transferItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.productId) {
          const selProd = products.find((p) => p.id === updates.productId);
          if (selProd) {
            updated.productName = selProd.name;
            updated.sku = selProd.sku;
            updated.unit = selProd.unit;
          }
        }
        if (updates.quantitySent !== undefined) {
          updated.quantity = updated.quantitySent;
          const prod = products.find((p) => p.id === updated.productId);
          if (prod && prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY') {
            const curSerials = [...(updated.deviceSerials || [])];
            while (curSerials.length < updated.quantitySent) {
              curSerials.push({ deviceSerial: '', ponSerial: '' });
            }
            updated.deviceSerials = curSerials.slice(0, updated.quantitySent);
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveTransferItem = (id: string) => {
    setTransferItems(transferItems.filter((i) => i.id !== id));
  };

  // Sale Items Handlers
  const handleResetSaleForm = () => {
    setSaleItems([]);
    setSaleCustomerId(customers[0]?.id || '');
    setSaleBranchId(userBranchId);
    setSalePaymentMethod('Cash / Direct Payment');
    setSaleNotes('Direct retail product item sale to customer');
  };

  const updateSaleDeviceSerial = (lineIdx: number, sIdx: number, val: string) => {
    setSaleItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== lineIdx) return item;
        const serials = [...(item.deviceSerials || [])];
        serials[sIdx] = { ...serials[sIdx], deviceSerial: val };
        return { ...item, deviceSerials: serials };
      })
    );
  };

  const updateSalePonSerial = (lineIdx: number, sIdx: number, val: string) => {
    setSaleItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== lineIdx) return item;
        const serials = [...(item.deviceSerials || [])];
        serials[sIdx] = { ...serials[sIdx], ponSerial: val };
        return { ...item, deviceSerials: serials };
      })
    );
  };

  const handleAddSaleItem = (prodId?: string) => {
    const selProd = products.find((p) => p.id === prodId) || products[0];
    if (!selProd) return;

    const isSerialized = selProd.requiresSerialTracking !== false && selProd.trackingType !== 'QUANTITY_ONLY';
    let targetLineIdx = 0;
    let targetSerialIdx = 0;

    const existingIdx = saleItems.findIndex((i) => i.productId === selProd.id);
    if (existingIdx !== -1) {
      targetLineIdx = existingIdx;
      setSaleItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const newQty = item.quantity + 1;
          const currentSerials = [...(item.deviceSerials || [])];
          targetSerialIdx = currentSerials.length;
          if (isSerialized) {
            currentSerials.push({ deviceSerial: '', ponSerial: '' });
          }
          return {
            ...item,
            quantity: newQty,
            totalValue: Math.max(0, newQty * item.sellingPrice - item.discount),
            deviceSerials: isSerialized ? currentSerials : undefined,
          };
        })
      );
    } else {
      targetLineIdx = saleItems.length;
      targetSerialIdx = 0;
      const price = selProd.sellingPrice || 1000;
      setSaleItems((prev) => [
        ...prev,
        {
          id: `sli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: selProd.id,
          productName: selProd.name,
          sku: selProd.sku,
          unit: selProd.unit,
          quantity: 1,
          sellingPrice: price,
          discount: 0,
          totalValue: price,
          deviceSerials: isSerialized ? [{ deviceSerial: '', ponSerial: '' }] : undefined,
        },
      ]);
    }

    if (isSerialized) {
      focusInput(`sale-serial-device-${targetLineIdx}-${targetSerialIdx}`);
    }
  };

  const handleUpdateSaleItem = (id: string, updates: Partial<SaleItem>) => {
    setSaleItems(
      saleItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.productId) {
          const selProd = products.find((p) => p.id === updates.productId);
          if (selProd) {
            updated.productName = selProd.name;
            updated.sku = selProd.sku;
            updated.unit = selProd.unit;
            if (updates.sellingPrice === undefined) {
              updated.sellingPrice = selProd.sellingPrice || 1000;
            }
          }
        }
        if (updates.quantity !== undefined || updates.sellingPrice !== undefined || updates.discount !== undefined) {
          updated.totalValue = Math.max(0, (updated.quantity * updated.sellingPrice) - updated.discount);
          const prod = products.find((p) => p.id === updated.productId);
          if (prod && prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY') {
            const curSerials = [...(updated.deviceSerials || [])];
            while (curSerials.length < updated.quantity) {
              curSerials.push({ deviceSerial: '', ponSerial: '' });
            }
            updated.deviceSerials = curSerials.slice(0, updated.quantity);
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveSaleItem = (id: string) => {
    setSaleItems(saleItems.filter((i) => i.id !== id));
  };

  // Consumable Items Handlers
  const handleResetConsumableForm = () => {
    setConsumableItems([]);
    setConsumableBranchId(userBranchId);
    setConsumableTechnician('Field Splicing Technician');
    setConsumableWorkOrder('WO-2081-SPLIT-01');
    setConsumableReason('Field fiber splicing & customer drop installation material usage');
  };

  const handleAddConsumableItem = (prodId?: string) => {
    const consumableProducts = products.filter(p => p.productGroup === 'Consumable Item' || p.category.includes('Consumable'));
    const selProd = products.find((p) => p.id === prodId) || consumableProducts[0] || products[0];
    if (!selProd) return;

    const existingItem = consumableItems.find((i) => i.productId === selProd.id);
    if (existingItem) {
      handleUpdateConsumableItem(existingItem.id, { quantity: existingItem.quantity + 1 });
      return;
    }

    setConsumableItems([
      ...consumableItems,
      {
        id: `cni-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: selProd.id,
        productName: selProd.name,
        sku: selProd.sku,
        unit: selProd.unit,
        quantity: 5,
        unitCost: selProd.costPrice,
        totalValue: 5 * selProd.costPrice,
      },
    ]);
  };

  const handleUpdateConsumableItem = (id: string, updates: Partial<ConsumableIssueItem>) => {
    setConsumableItems(
      consumableItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.productId) {
          const selProd = products.find((p) => p.id === updates.productId);
          if (selProd) {
            updated.productName = selProd.name;
            updated.sku = selProd.sku;
            updated.unit = selProd.unit;
            updated.unitCost = selProd.costPrice;
          }
        }
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          updated.totalValue = updated.quantity * updated.unitCost;
        }
        return updated;
      })
    );
  };

  const handleRemoveConsumableItem = (id: string) => {
    setConsumableItems(consumableItems.filter((i) => i.id !== id));
  };

  // Shared Branch Inventory & Serial Register Validation
  const validateSourceBranchStockAndSerials = (
    branchId: string,
    branchName: string,
    items: {
      productId: string;
      productName: string;
      quantity: number;
      condition?: string;
      deviceSerials?: { deviceSerial: string; ponSerial?: string }[];
    }[]
  ): boolean => {
    const seenSerials = new Set<string>();

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      const isSerialized = prod ? prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY' : true;
      const srcStock = stock.find((s) => s.productId === item.productId && s.branchId === branchId);

      const isDamagedPullout = item.condition === 'DAMAGED_STOCK';
      const availStock = srcStock ? (isDamagedPullout ? (srcStock.damagedQty || 0) : srcStock.quantityOnHand) : 0;

      // 1. Validate Branch Stock Quantity On Hand / Damaged Stock
      if (availStock < item.quantity) {
        alert(
          `Branch Stock Error: "${branchName}" only has ${availStock} ${isDamagedPullout ? 'damaged' : 'usable'} unit(s) of "${item.productName}", but ${item.quantity} unit(s) are requested.`
        );
        return false;
      }

      // 2. Validate Serial Tracking & Register for Serialized Items
      if (isSerialized) {
        if (!item.deviceSerials || item.deviceSerials.length < item.quantity) {
          alert(`Validation Error: Please enter serial numbers for all ${item.quantity} unit(s) of "${item.productName}".`);
          return false;
        }

        for (let sIdx = 0; sIdx < item.quantity; sIdx++) {
          const s = item.deviceSerials[sIdx];
          if (!s || !s.deviceSerial?.trim()) {
            alert(`Validation Error: Device Serial # is required for "${item.productName}" (Unit #${sIdx + 1}).`);
            return false;
          }

          const cleanSerial = s.deviceSerial.trim().toUpperCase();
          const cleanPon = s.ponSerial?.trim().toUpperCase();

          if (seenSerials.has(cleanSerial)) {
            alert(`Validation Error: Duplicate Device Serial #${cleanSerial} detected in requested items.`);
            return false;
          }
          seenSerials.add(cleanSerial);

          // Check against customerDevices serial register if populated
          if (customerDevices.length > 0) {
            const match = customerDevices.find(
              (cd) =>
                cd.deviceSerial.trim().toUpperCase() === cleanSerial ||
                (cleanPon && cd.ponSerial && cd.ponSerial.trim().toUpperCase() === cleanPon)
            );

            if (match) {
              if (match.branchId !== branchId) {
                const regBranch = branches.find((b) => b.id === match.branchId);
                alert(
                  `Serial Register Error: Serial #${cleanSerial} is registered to branch "${regBranch?.name || match.branchId}", not "${branchName}".`
                );
                return false;
              }
              if (match.status && match.status !== 'IN_STOCK') {
                alert(
                  `Serial Register Error: Serial #${cleanSerial} in branch "${branchName}" has status "${match.status}" (must be "IN_STOCK").`
                );
                return false;
              }
            } else {
              const branchInStockSerials = customerDevices.filter(
                (cd) => cd.branchId === branchId && cd.status === 'IN_STOCK'
              );
              if (branchInStockSerials.length > 0) {
                alert(
                  `Serial Register Error: Serial #${cleanSerial} for "${item.productName}" is not found in the branch serial register for "${branchName}".`
                );
                return false;
              }
            }
          }
        }
      }
    }

    return true;
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

    // Strict validation for Branch Stock Quantity and Serial Register
    if (
      !validateSourceBranchStockAndSerials(
        sourceBranchId,
        srcBranch?.name || sourceBranchId,
        pulloutItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          condition: i.condition,
          deviceSerials: i.deviceSerials,
        }))
      )
    ) {
      return;
    }

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

    if (
      !validateSourceBranchStockAndSerials(
        targetBranch,
        branches.find((b) => b.id === targetBranch)?.name || targetBranch,
        [
          {
            productId: damageProductId,
            productName: prod.name,
            quantity: Number(damageQty),
          },
        ]
      )
    ) {
      return;
    }

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
    const srcBranch = branches.find((b) => b.id === xferSourceBranchId);
    const destBranch = branches.find((b) => b.id === xferDestBranchId);

    if (!srcBranch || !destBranch) return;

    if (xferSourceBranchId === xferDestBranchId) {
      alert('Source and Destination branches must be different.');
      return;
    }

    if (transferItems.length === 0) {
      alert('Please add at least one product item to transfer.');
      return;
    }

    if (
      !validateSourceBranchStockAndSerials(
        xferSourceBranchId,
        srcBranch.name,
        transferItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantitySent,
          deviceSerials: i.deviceSerials,
        }))
      )
    ) {
      return;
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
        items: transferItems,
        notes: xferNotes,
      });
      alert(`Inter-Branch Stock Transfer with ${transferItems.length} line item(s) successfully dispatched!`);
      setTransferItems([]);
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
    if (consumableItems.length === 0) {
      alert('Please add at least one consumable item to issue.');
      return;
    }

    const branchObj = branches.find((b) => b.id === consumableBranchId);

    if (
      !validateSourceBranchStockAndSerials(
        consumableBranchId,
        branchObj?.name || consumableBranchId,
        consumableItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
        }))
      )
    ) {
      return;
    }

    const grandTotal = consumableItems.reduce((sum, item) => sum + item.totalValue, 0);

    await onCreateOperation({
      type: 'CONSUMABLE_ISSUE',
      branchId: consumableBranchId,
      branchName: branchObj?.name,
      items: consumableItems,
      totalValue: grandTotal,
      technicianName: consumableTechnician,
      workOrderRef: consumableWorkOrder,
      reason: `Consumable Field Issue: WO ${consumableWorkOrder} (${consumableTechnician}) - ${consumableReason}`,
      inspectorName: currentUser?.name || 'Store Supervisor',
      status: 'LOGGED',
    });

    alert(`Successfully issued ${consumableItems.length} consumable material line item(s) to Technician ${consumableTechnician} for Work Order ${consumableWorkOrder}!`);
    setConsumableItems([]);
    setConsumableReason('Field fiber splicing & customer drop installation material usage');
  };

  // 5. Submit Product Sale to Customer
  const handleSubmitProductSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === saleCustomerId);
    const branchObj = branches.find((b) => b.id === saleBranchId);

    if (!cust) return;

    if (saleItems.length === 0) {
      alert('Please add at least one product item to the sales invoice.');
      return;
    }

    // Strict validation for Branch Stock Quantity and Serial Register
    if (
      !validateSourceBranchStockAndSerials(
        saleBranchId,
        branchObj?.name || saleBranchId,
        saleItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          deviceSerials: i.deviceSerials,
        }))
      )
    ) {
      return;
    }

    const grossTotal = saleItems.reduce((s, i) => s + (i.quantity * i.sellingPrice), 0);
    const totalDiscount = saleItems.reduce((s, i) => s + i.discount, 0);
    const netSaleAmount = Math.max(0, grossTotal - totalDiscount);

    await onCreateOperation({
      type: 'STOCK_OUT',
      branchId: saleBranchId,
      branchName: branchObj?.name,
      items: saleItems,
      totalValue: netSaleAmount,
      customerId: cust.id,
      customerName: `${cust.customerName} (${cust.customerId})`,
      paymentMethod: salePaymentMethod,
      reason: `Customer Product Sale Invoice (${saleItems.length} items): ${cust.customerName} - ${saleNotes}`,
      inspectorName: currentUser?.name || 'Sales Representative',
      status: 'LOGGED',
    });

    alert(`Multi-item Product Sales Invoice logged successfully! Net Bill Amount: रु ${netSaleAmount.toLocaleString('en-IN')}`);
    setSaleItems([]);
  };

  // Helper to check if an operation belongs to user's allowed branches
  const isOpInAllowedBranch = (op: StockOperation) => {
    if (canSeeAll) return true;
    return (
      (op.branchId && allowedBranchIds.includes(op.branchId)) ||
      (op.destinationWarehouseId && allowedBranchIds.includes(op.destinationWarehouseId))
    );
  };

  // Synthesize missing stock operation entries for inventory stock items that have damagedQty > 0
  const existingDamageOps = operations.filter((op) => op.type === 'DAMAGE' && isOpInAllowedBranch(op));
  const synthesizedDamageOps: StockOperation[] = [];
  stock.forEach((stk) => {
    if (stk.damagedQty && stk.damagedQty > 0) {
      if (isOpInAllowedBranch({ branchId: stk.branchId } as any)) {
        const hasMatchingOp = existingDamageOps.some(
          (op) => op.productId === stk.productId && op.branchId === stk.branchId
        );
        if (!hasMatchingOp) {
          const prod = products.find((p) => p.id === stk.productId);
          synthesizedDamageOps.push({
            id: `syn-dmg-${stk.id}`,
            referenceNumber: `DMG-${stk.branchId}-${stk.productId.replace('prod-', '').toUpperCase().slice(0, 8)}`,
            type: 'DAMAGE',
            branchId: stk.branchId,
            productId: stk.productId,
            productName: prod?.name || 'Damaged Stock Item',
            quantityChanged: -stk.damagedQty,
            costPerUnit: prod?.costPrice || 0,
            totalValue: stk.damagedQty * (prod?.costPrice || 0),
            reason: 'Physical branch inventory inspection & transit damage tag',
            inspectorName: 'Branch Quality Inspector',
            dateAD: stk.lastUpdated ? stk.lastUpdated.split('T')[0] : '2026-07-22',
            dateBS: '2083-04-07 BS',
            fiscalYear: '2082-83',
          });
        }
      }
    }
  });

  const damageOperations = [...existingDamageOps, ...synthesizedDamageOps];
  const pulloutOperations = operations.filter((op) => op.type === 'PULLOUT' && isOpInAllowedBranch(op));
  const consumableOperations = operations.filter((op) => op.type === 'CONSUMABLE_ISSUE' && isOpInAllowedBranch(op));
  const saleOperations = operations.filter((op) => op.type === 'STOCK_OUT' && isOpInAllowedBranch(op));

  const allCombinedOps = [...operations, ...synthesizedDamageOps];

  // Filters for Stock Operations Logs
  const filteredOperations = allCombinedOps.filter((op) => {
    if (!isOpInAllowedBranch(op)) return false;

    const matchesBranch =
      branchFilter === 'ALL'
        ? true
        : op.branchId === branchFilter || op.destinationWarehouseId === branchFilter;

    if (!matchesBranch) return false;

    if (activeTab === 'PULLOUT_BINS') return op.type === 'PULLOUT';
    if (activeTab === 'DAMAGE_TRACKING') return op.type === 'DAMAGE' || op.type === 'DISPOSAL';
    if (activeTab === 'CONSUMABLE_ISSUE') return op.type === 'CONSUMABLE_ISSUE';
    if (activeTab === 'PRODUCT_SALE') return op.type === 'STOCK_OUT';
    return true;
  });

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

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Total Damaged Log Records</div>
              <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {filteredOperations.length} Records
              </div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Total Damaged Stock Units</div>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {filteredOperations.reduce((sum, op) => sum + Math.abs(op.quantityChanged || 1), 0)} Pcs
              </div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Total Estimated Loss Valuation</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                रु {filteredOperations.reduce((sum, op) => sum + (op.totalValue || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

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
                    <th className="p-2.5">Op Type</th>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Valuation</th>
                    <th className="p-2.5">Reason & Method</th>
                    <th className="p-2.5">Inspector / Officer</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {filteredOperations.map((op) => (
                    <tr key={op.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">{op.referenceNumber}</td>
                      <td className="p-2.5">
                        {op.type === 'DISPOSAL' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                            🔥 DISPOSAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            ⚠️ DAMAGED
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{op.branchId}</td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">{op.productName}</td>
                      <td className="p-2.5 font-mono font-bold text-rose-600">{Math.abs(op.quantityChanged || 1)} Pcs</td>
                      <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div>रु {op.totalValue.toLocaleString('en-IN')}</div>
                        {op.netWriteOffLoss !== undefined && (
                          <div className="text-[10px] font-normal text-rose-500">
                            Net Loss: रु {op.netWriteOffLoss.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{op.reason}</td>
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

                      {/* Itemized Transferred Stock List & Serial Tracking Inspector */}
                      <div className="mt-2 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                          Transferred Stock Items ({sh.items?.length || 0}):
                        </span>
                        
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead className={`text-[10px] font-bold uppercase tracking-wider border-b ${
                              isDarkMode ? 'bg-slate-800/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              <tr>
                                <th className="p-2">SKU & Item Name</th>
                                <th className="p-2 text-center">Transfer Qty</th>
                                <th className="p-2">Serial & MAC Tracking</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y text-[11px] ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                              {sh.items?.map((item, idx) => {
                                const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
                                const isSerialized = Boolean(
                                  item.deviceSerials?.length || 
                                  prod?.requiresSerialTracking || 
                                  prod?.trackingType === 'SERIAL_MAC_PON'
                                );

                                return (
                                  <tr key={item.id || idx} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                    <td className="p-2">
                                      <div className="font-bold text-slate-900 dark:text-white">{item.productName}</div>
                                      <div className="text-[10px] font-mono text-slate-400">SKU: {item.sku || prod?.sku || 'N/A'}</div>
                                    </td>
                                    <td className="p-2 text-center font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                                      {item.quantitySent || item.quantity} {item.unit || 'pcs'}
                                    </td>
                                    <td className="p-2">
                                      {isSerialized ? (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                            <Tag className="h-3 w-3" />
                                            <span>Serial Tracked ({item.deviceSerials?.length || item.quantitySent || item.quantity} Units)</span>
                                          </div>
                                          
                                          {item.deviceSerials && item.deviceSerials.length > 0 ? (
                                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                              {item.deviceSerials.map((ser, sIdx) => (
                                                <div key={sIdx} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] space-y-0.5">
                                                  <div className="text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between">
                                                    <span>SN: {ser.deviceSerial}</span>
                                                    <span className="text-[9px] px-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold">VERIFIED</span>
                                                  </div>
                                                  {ser.ponSerial && <div className="text-slate-500 dark:text-slate-400 text-[9.5px]">PON: {ser.ponSerial}</div>}
                                                  {ser.macAddress && <div className="text-slate-500 dark:text-slate-400 text-[9.5px]">MAC: {ser.macAddress}</div>}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-[10px] font-mono text-slate-500 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-800">
                                              Auto Serial Generation on Receive Confirmation
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-[10px] italic">Non-serialized bulk material</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {sh.notes && <p className="text-[11px] text-slate-400 mt-1 italic">{sh.notes}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400">Dispatch Date: {sh.dispatchDateAD}</span>

                      {sh.status !== 'RECEIVED' && sh.status !== 'DELIVERED' && onReceiveShipment ? (
                        <button
                          onClick={() => openReceiveModal(sh)}
                          title="Verify physical quantities & hardware serial/MAC checklist before adding to branch stock"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-sm cursor-pointer transition-all"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Verify & Receive Stock</span>
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
      {/* ------------------------------------------------------------- */}
      {/* TAB 4: CREATE TRANSFER (Multi-Item Inter-Branch Dispatch) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'CREATE_TRANSFER' && (
        <div className={`p-6 rounded-2xl border max-w-4xl mx-auto shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-serif font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-sky-500" />
              <span>Create Inter-Branch Multi-Stock Transfer Dispatch</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
              Inter-Branch Shipment GRN
            </span>
          </div>

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

            {/* Multi-Item Transfer Table */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block font-bold">Scan Barcode or Search & Enter Product Name / SKU to Add *</label>
                <ProductSearchBar
                  products={products}
                  onAddOrIncrementProduct={(prod) => handleAddTransferItem(prod.id)}
                  placeholder="Scan Barcode or Search & Enter Product Name / SKU to Add to Transfer..."
                  inputId="transfer-product-search-input"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="block font-bold">Transfer Line Items ({transferItems.length}) *</label>
                <button
                  type="button"
                  onClick={() => handleAddTransferItem()}
                  className="px-3 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px] hover:bg-sky-500 shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {transferItems.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>No stock items added to this inter-branch transfer yet.</p>
                  <button
                    type="button"
                    onClick={() => handleAddTransferItem()}
                    className="mt-2 text-sky-500 hover:text-sky-600 font-bold text-xs cursor-pointer"
                  >
                    + Click here to add products to transfer
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className={`font-bold uppercase text-[9px] tracking-wider border-b ${
                      isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <tr>
                        <th className="p-2.5">Product SKU & Name</th>
                        <th className="p-2.5 text-center">Branch Stock</th>
                        <th className="p-2.5 text-center">Transfer Qty</th>
                        <th className="p-2.5 min-w-[280px]">Serials & PON Scanning</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {transferItems.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        const stk = stock.find((s) => s.productId === item.productId && s.branchId === xferSourceBranchId);
                        const isSerialized = prod ? prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY' : true;

                        return (
                          <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="p-2.5">
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateTransferItem(item.id, { productId: e.target.value })}
                                className={`w-full rounded-lg border p-1.5 font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name} ({p.unit})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                              {stk?.quantityOnHand || 0} {item.unit}
                            </td>

                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                required
                                value={item.quantitySent}
                                onChange={(e) => handleUpdateTransferItem(item.id, { quantitySent: Number(e.target.value) })}
                                className={`w-20 rounded-lg border p-1 text-center font-mono font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>

                            <td className="p-2.5">
                              {isSerialized ? (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold block">
                                    ✓ Scan Serials for {item.productName} ({item.quantitySent} Unit{item.quantitySent > 1 ? 's' : ''})
                                  </span>
                                  {Array.from({ length: item.quantitySent }).map((_, sIdx) => (
                                    <div key={sIdx} className="bg-sky-50/50 dark:bg-sky-950/40 p-1.5 rounded-lg border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 text-xs">
                                      <span className="font-mono text-[10px] font-bold text-slate-400">#{sIdx + 1}</span>
                                      <input
                                        id={`transfer-serial-device-${idx}-${sIdx}`}
                                        type="text"
                                        placeholder="Device Serial #"
                                        value={item.deviceSerials?.[sIdx]?.deviceSerial || ''}
                                        onChange={(e) => updateTransferDeviceSerial(idx, sIdx, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const nextEl = document.getElementById(`transfer-serial-pon-${idx}-${sIdx}`) as HTMLInputElement;
                                            if (nextEl) {
                                              nextEl.focus();
                                              if ('select' in nextEl) nextEl.select();
                                            }
                                          }
                                        }}
                                        className="w-1/2 px-2 py-1 text-[11px] font-mono font-bold text-sky-900 dark:text-sky-200 bg-white dark:bg-slate-900 rounded border border-sky-300 dark:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                      />
                                      <input
                                        id={`transfer-serial-pon-${idx}-${sIdx}`}
                                        type="text"
                                        placeholder="PON Serial #"
                                        value={item.deviceSerials?.[sIdx]?.ponSerial || ''}
                                        onChange={(e) => updateTransferPonSerial(idx, sIdx, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (sIdx + 1 < item.quantitySent) {
                                              const nextDev = document.getElementById(`transfer-serial-device-${idx}-${sIdx + 1}`) as HTMLInputElement;
                                              if (nextDev) {
                                                nextDev.focus();
                                                if ('select' in nextDev) nextDev.select();
                                              }
                                            } else {
                                              const searchInput = document.getElementById('transfer-product-search-input') as HTMLInputElement;
                                              if (searchInput) {
                                                searchInput.focus();
                                                if ('select' in searchInput) searchInput.select();
                                              }
                                            }
                                          }
                                        }}
                                        className="w-1/2 px-2 py-1 text-[11px] font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-slate-900 rounded border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Non-serialized bulk product</span>
                              )}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveTransferItem(item.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetTransferForm}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset / Cancel Form</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Dispatch Multi-Item Transfer Shipment</span>
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
        <div className={`p-6 rounded-2xl border max-w-4xl mx-auto shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-serif font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              <span>Issue Consumable Items (Splitter, Sleeve, Coupler, Fast Connector)</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              Quantity Store Requisition
            </span>
          </div>

          <form onSubmit={handleSubmitConsumableIssue} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
              <strong>Consumables Operational Rule:</strong> Field materials (Splitters, Protection Sleeves, Couplers, Fast Connectors, Patch Cords, Drop Clamps) do NOT carry individual serial numbers. Issuing deducts store stock directly and logs the assigned field technician and work order ticket.
            </div>

            <div className="grid grid-cols-3 gap-3">
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

            {/* Multi-Item Consumables Requisition Table */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block font-bold">Scan Barcode or Search & Enter Consumable Material / SKU to Add *</label>
                <ProductSearchBar
                  products={products}
                  onAddOrIncrementProduct={(prod) => handleAddConsumableItem(prod.id)}
                  placeholder="Scan Barcode or Search & Enter Consumable Product / SKU to Issue..."
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="block font-bold">Consumable Material Line Items ({consumableItems.length}) *</label>
                <button
                  type="button"
                  onClick={() => handleAddConsumableItem()}
                  className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-500 shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Material Line Item</span>
                </button>
              </div>

              {consumableItems.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>No consumable materials added to this requisition form yet.</p>
                  <button
                    type="button"
                    onClick={() => handleAddConsumableItem()}
                    className="mt-2 text-amber-500 hover:text-amber-600 font-bold text-xs cursor-pointer"
                  >
                    + Click here to add consumable products to issue
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className={`font-bold uppercase text-[9px] tracking-wider border-b ${
                      isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <tr>
                        <th className="p-2.5">Consumable Material</th>
                        <th className="p-2.5 text-center">Store Stock</th>
                        <th className="p-2.5 text-center">Issue Qty</th>
                        <th className="p-2.5 text-right">Unit Cost</th>
                        <th className="p-2.5 text-right">Total Cost</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {consumableItems.map((item) => {
                        const stk = stock.find((s) => s.productId === item.productId && s.branchId === consumableBranchId);

                        return (
                          <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="p-2.5">
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateConsumableItem(item.id, { productId: e.target.value })}
                                className={`w-full rounded-lg border p-1.5 font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name} ({p.unit})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                              {stk?.quantityOnHand || 0} {item.unit}
                            </td>

                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                required
                                value={item.quantity}
                                onChange={(e) => handleUpdateConsumableItem(item.id, { quantity: Number(e.target.value) })}
                                className={`w-20 rounded-lg border p-1 text-center font-mono font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>

                            <td className="p-2.5 text-right font-mono text-slate-500">
                              रु {item.unitCost}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              रु {item.totalValue.toLocaleString('en-IN')}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveConsumableItem(item.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetConsumableForm}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset / Cancel Form</span>
              </button>

              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                <span>Record Multi-Item Consumable Issue & Deduct Stock</span>
              </button>
            </div>
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
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{op.productName || (op.items && op.items[0]?.productName) || 'Multiple Line Items'}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-600">
                          {Math.abs(op.quantityChanged || (op.items ? op.items.reduce((s,i)=>s+i.quantity,0) : 1))} Pcs
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
      {/* TAB 7: PRODUCT SALE TO CUSTOMER (Multi-Item Sales Invoice) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PRODUCT_SALE' && (
        <div className={`p-6 rounded-2xl border max-w-4xl mx-auto shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-serif font-bold flex items-center gap-2">
              <PackageMinus className="h-5 w-5 text-purple-500" />
              <span>Multi-Item Product Sales Invoice (Stock Out)</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
              Retail Sales Invoice
            </span>
          </div>

          <form onSubmit={handleSubmitProductSale} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
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
            </div>

            {/* Multi-Item Sales Table */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block font-bold">Scan Barcode or Search & Enter Product Name / SKU to Add *</label>
                <ProductSearchBar
                  products={products}
                  onAddOrIncrementProduct={(prod) => handleAddSaleItem(prod.id)}
                  placeholder="Scan Barcode or Search & Enter Product Name / SKU to Add to Sales Invoice..."
                  inputId="sale-product-search-input"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="block font-bold">Sales Invoice Line Items ({saleItems.length}) *</label>
                <button
                  type="button"
                  onClick={() => handleAddSaleItem()}
                  className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-500 shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Product to Invoice</span>
                </button>
              </div>

              {saleItems.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400">
                  <PackageMinus className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>No product items added to this sales invoice yet.</p>
                  <button
                    type="button"
                    onClick={() => handleAddSaleItem()}
                    className="mt-2 text-purple-500 hover:text-purple-600 font-bold text-xs cursor-pointer"
                  >
                    + Click here to add products to sale invoice
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className={`font-bold uppercase text-[9px] tracking-wider border-b ${
                      isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <tr>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5 text-center">Branch Stock</th>
                        <th className="p-2.5 text-center">Sale Qty</th>
                        <th className="p-2.5 text-right">Unit Price (रु)</th>
                        <th className="p-2.5 text-right">Discount (रु)</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {saleItems.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        const stk = stock.find((s) => s.productId === item.productId && s.branchId === saleBranchId);
                        const isSerialized = prod ? prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY' : true;

                        return (
                          <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="p-2.5 min-w-[240px]">
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateSaleItem(item.id, { productId: e.target.value })}
                                className={`w-full rounded-lg border p-1.5 font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name} ({p.unit})
                                  </option>
                                ))}
                              </select>

                              {isSerialized && (
                                <div className="mt-2 space-y-1 bg-purple-50/50 dark:bg-purple-950/40 p-2 rounded-lg border border-purple-200 dark:border-purple-800/60">
                                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">
                                    ✓ Scan Serials for {item.productName} ({item.quantity} Unit{item.quantity > 1 ? 's' : ''})
                                  </span>
                                  {Array.from({ length: item.quantity }).map((_, sIdx) => (
                                    <div key={sIdx} className="flex items-center gap-1.5 mt-1 text-xs">
                                      <span className="font-mono text-[10px] font-bold text-slate-400">#{sIdx + 1}</span>
                                      <input
                                        id={`sale-serial-device-${idx}-${sIdx}`}
                                        type="text"
                                        placeholder="Device Serial #"
                                        value={item.deviceSerials?.[sIdx]?.deviceSerial || ''}
                                        onChange={(e) => updateSaleDeviceSerial(idx, sIdx, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const nextEl = document.getElementById(`sale-serial-pon-${idx}-${sIdx}`) as HTMLInputElement;
                                            if (nextEl) {
                                              nextEl.focus();
                                              if ('select' in nextEl) nextEl.select();
                                            }
                                          }
                                        }}
                                        className="w-1/2 px-2 py-1 text-[11px] font-mono font-bold text-purple-900 dark:text-purple-200 bg-white dark:bg-slate-900 rounded border border-purple-300 dark:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      />
                                      <input
                                        id={`sale-serial-pon-${idx}-${sIdx}`}
                                        type="text"
                                        placeholder="PON Serial #"
                                        value={item.deviceSerials?.[sIdx]?.ponSerial || ''}
                                        onChange={(e) => updateSalePonSerial(idx, sIdx, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (sIdx + 1 < item.quantity) {
                                              const nextDev = document.getElementById(`sale-serial-device-${idx}-${sIdx + 1}`) as HTMLInputElement;
                                              if (nextDev) {
                                                nextDev.focus();
                                                if ('select' in nextDev) nextDev.select();
                                              }
                                            } else {
                                              const searchInput = document.getElementById('sale-product-search-input') as HTMLInputElement;
                                              if (searchInput) {
                                                searchInput.focus();
                                                if ('select' in searchInput) searchInput.select();
                                              }
                                            }
                                          }
                                        }}
                                        className="w-1/2 px-2 py-1 text-[11px] font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-slate-900 rounded border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                              {stk?.quantityOnHand || 0} {item.unit}
                            </td>

                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                required
                                value={item.quantity}
                                onChange={(e) => handleUpdateSaleItem(item.id, { quantity: Number(e.target.value) })}
                                className={`w-16 rounded-lg border p-1 text-center font-mono font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>

                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                required
                                value={item.sellingPrice}
                                onChange={(e) => handleUpdateSaleItem(item.id, { sellingPrice: Number(e.target.value) })}
                                className={`w-24 rounded-lg border p-1 text-right font-mono font-bold ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>

                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                value={item.discount}
                                onChange={(e) => handleUpdateSaleItem(item.id, { discount: Number(e.target.value) })}
                                className={`w-20 rounded-lg border p-1 text-right font-mono text-amber-600 dark:text-amber-400 ${
                                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              रु {item.totalValue.toLocaleString('en-IN')}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSaleItem(item.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Billing Summary Banner */}
            {saleItems.length > 0 && (
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Product Bill</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    रु {saleItems.reduce((s, i) => s + (i.quantity * i.sellingPrice), 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Discounts Applied</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    रु {saleItems.reduce((s, i) => s + i.discount, 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Net Receivable Bill Amount</span>
                  <span className="font-mono font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                    रु {Math.max(0, saleItems.reduce((s, i) => s + (i.quantity * i.sellingPrice), 0) - saleItems.reduce((s, i) => s + i.discount, 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetSaleForm}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset / Cancel Form</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-md flex items-center gap-2 cursor-pointer"
              >
                <PackageMinus className="h-4 w-4" />
                <span>Submit Product Sales Invoice</span>
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
                    {effectivePulloutSourceBranches.map((b) => (
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
                    {destWarehouseOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) {b.isHeadquarters ? '⭐ Central HQ' : '🏬 Warehouse'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Scan Barcode or Search & Enter Product Name / SKU to Add *</label>
                <ProductSearchBar
                  products={products}
                  onAddOrIncrementProduct={(prod) => handleAddProductToPullout(prod)}
                  placeholder="Scan Barcode or Search & Enter Product Name / SKU for Pullout..."
                  inputId="pullout-product-search-input"
                />
              </div>

              {/* Added Pullout Items List */}
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-xl p-2">
                {pulloutItems.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 text-xs">No items added to pullout bin yet. Search above to add items.</p>
                ) : (
                  pulloutItems.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const isSerialized = prod ? prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY' : true;

                    return (
                      <div key={item.id} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="font-bold text-slate-900 dark:text-white block">{item.productName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                              <select
                                value={item.condition}
                                onChange={(e) => handleUpdatePulloutItem(item.id, { condition: e.target.value as any })}
                                className="text-[10px] font-bold rounded border px-1.5 py-0.5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                              >
                                <option value="OVERSTOCK">OVERSTOCK</option>
                                <option value="DAMAGED_STOCK">DAMAGED_STOCK</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[9px] text-slate-400 block text-right">Pullout Qty</span>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdatePulloutItem(item.id, { quantity: Number(e.target.value) })}
                                className="w-16 rounded border p-1 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900"
                              />
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block">Total Val</span>
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                रु {item.totalValue.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePulloutItem(item.id)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Serial Tracking Inputs */}
                        {isSerialized && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                              <span>✓ Scan Serials for {item.productName} ({item.quantity} Unit{item.quantity > 1 ? 's' : ''})</span>
                            </div>
                            {Array.from({ length: item.quantity }).map((_, sIdx) => (
                              <div key={sIdx} className="bg-white dark:bg-slate-900/80 p-1.5 rounded-lg border flex items-center gap-1.5 text-xs">
                                <span className="font-mono text-[10px] font-bold text-slate-400">#{sIdx + 1}</span>
                                <input
                                  id={`pullout-serial-device-${idx}-${sIdx}`}
                                  type="text"
                                  placeholder="Device Serial #"
                                  value={item.deviceSerials?.[sIdx]?.deviceSerial || ''}
                                  onChange={(e) => updatePulloutDeviceSerial(idx, sIdx, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextEl = document.getElementById(`pullout-serial-pon-${idx}-${sIdx}`) as HTMLInputElement;
                                      if (nextEl) {
                                        nextEl.focus();
                                        if ('select' in nextEl) nextEl.select();
                                      }
                                    }
                                  }}
                                  className="w-1/2 px-2 py-1 text-[11px] font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-slate-50 dark:bg-slate-950 rounded border border-indigo-200 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                  id={`pullout-serial-pon-${idx}-${sIdx}`}
                                  type="text"
                                  placeholder="PON Serial #"
                                  value={item.deviceSerials?.[sIdx]?.ponSerial || ''}
                                  onChange={(e) => updatePulloutPonSerial(idx, sIdx, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (sIdx + 1 < item.quantity) {
                                        const nextDev = document.getElementById(`pullout-serial-device-${idx}-${sIdx + 1}`) as HTMLInputElement;
                                        if (nextDev) {
                                          nextDev.focus();
                                          if ('select' in nextDev) nextDev.select();
                                        }
                                      } else {
                                        const searchInput = document.getElementById('pullout-product-search-input') as HTMLInputElement;
                                        if (searchInput) {
                                          searchInput.focus();
                                          if ('select' in searchInput) searchInput.select();
                                        }
                                      }
                                    }
                                  }}
                                  className="w-1/2 px-2 py-1 text-[11px] font-mono font-bold text-sky-900 dark:text-sky-200 bg-slate-50 dark:bg-slate-950 rounded border border-sky-200 dark:border-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
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

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPulloutItems([]);
                    setBinNotes('Warehouse overstock & damaged inventory pullout return dispatch');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Form</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPulloutModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                <label className="block font-bold mb-1">Scan Barcode or Search & Select Damaged Product *</label>
                <ProductSearchBar
                  products={products}
                  onAddOrIncrementProduct={(prod) => setDamageProductId(prod.id)}
                  placeholder="Scan Barcode or Search & Select Damaged Product..."
                />
                {damageProductId && (
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Selected: {products.find((p) => p.id === damageProductId)?.name}
                    </span>
                    <span className="text-[10px] text-slate-400">SKU: {products.find((p) => p.id === damageProductId)?.sku}</span>
                  </div>
                )}
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

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDamageQty(1);
                    setDamageReason('');
                    setDamageInspector('Stores Quality Inspector');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Form</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDamageModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

      {/* Inbound Physical Stock Verification & Security Audit Modal */}
      {receivingShipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden my-6 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-sm">
                    Inbound Stock Physical Verification — {receivingShipmentModal.trackingCode}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Verify physical incoming quantities & device serial/MAC numbers before updating destination branch inventory.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceivingShipmentModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Route Summary Card */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dispatched From</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{receivingShipmentModal.sourceBranchName || 'Central Warehouse'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[10px] text-indigo-500 font-bold">{receivingShipmentModal.dispatchDateAD}</span>
                  <ArrowRight className="h-4 w-4 text-indigo-500 my-0.5" />
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Receiving Inspection</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Destination Branch</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{receivingShipmentModal.destinationBranchName}</span>
                </div>
              </div>

              {/* Security Advisory */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Security Audit Requirement:</span>
                  <span>
                    Receiver branch must count non-serial quantities and physically scan/verify each Device Serial & PON/MAC address unpacked from shipments. Any shortage or unverified unit will be logged as an <strong>In-Transit Discrepancy</strong> for management audit.
                  </span>
                </div>
              </div>

              {/* Item Lines Verification Table */}
              <div className="space-y-3">
                {receivingShipmentModal.items.map((item, idx) => {
                  const st = receiveItemStates[item.id] || {
                    quantityReceived: item.quantitySent || (item as any).quantity || 1,
                    verifiedSerials: [],
                    notes: '',
                  };
                  const sentQty = item.quantitySent || (item as any).quantity || 1;
                  const diff = st.quantityReceived - sentQty;
                  const hasSerials = item.deviceSerials && item.deviceSerials.length > 0;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <span>{idx + 1}. {item.productName}</span>
                            <span className="font-mono text-xs font-semibold text-slate-500">[{item.sku}]</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Dispatched Quantity: <strong className="text-slate-700 dark:text-slate-300 font-mono">{sentQty} {item.unit || 'Units'}</strong>
                          </span>
                        </div>

                        {/* Received Qty Entry */}
                        <div className="flex items-center gap-3">
                          <label className="font-bold text-slate-700 dark:text-slate-300">
                            Actual Received Qty:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={sentQty * 2}
                            value={st.quantityReceived}
                            onChange={(e) => updateReceiveQty(item.id, Number(e.target.value))}
                            className="w-20 text-center font-mono font-bold text-sm rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 p-1.5 focus:ring-2 focus:ring-indigo-500"
                          />

                          {diff === 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                              ✓ Full Match
                            </span>
                          ) : diff < 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">
                              ⚠ Shortage ({diff} Units)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-500/20">
                              ℹ Surplus (+{diff} Units)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Serial Check-Off List for Hardware */}
                      {hasSerials && (
                        <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 text-[11px]">
                              <Barcode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Device Serial & MAC/PON Check-Off Checklist ({st.verifiedSerials.filter(s => s.isChecked).length} / {item.deviceSerials?.length} Checked):</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {st.verifiedSerials.map((s, sIdx) => (
                              <label
                                key={sIdx}
                                className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                                  s.isChecked
                                    ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={s.isChecked}
                                  onChange={() => toggleSerialCheck(item.id, sIdx)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <div className="flex-1 font-mono text-[11px] min-w-0">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {s.deviceSerial}
                                  </div>
                                  {s.ponSerial && (
                                    <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate">
                                      PON: {s.ponSerial}
                                    </div>
                                  )}
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${s.isChecked ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {s.isChecked ? 'Verified' : 'Missing'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Item Discrepancy Remarks */}
                      <div>
                        <input
                          type="text"
                          placeholder="Discrepancy / Damage notes for this item (if any)..."
                          value={st.notes}
                          onChange={(e) => updateItemDiscrepancyNotes(item.id, e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* General Receiving Officer Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Receiving Inspection Officer Notes & Waybill Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received by Subash Shrestha at Pokhara Branch. Seal was intact, counted & checked."
                  value={receivingByNotes}
                  onChange={(e) => setReceivingByNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className={`p-4 border-t flex items-center justify-between ${
              isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setReceivingShipmentModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReceiveVerification}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Physical Receiving & Add to Branch Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
