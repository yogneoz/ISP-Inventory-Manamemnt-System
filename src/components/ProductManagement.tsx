import React, { useState } from 'react';
import { InventoryStock, Product } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  BarChart2,
  X,
  Check,
  Tag,
  Barcode,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface ProductManagementProps {
  products: Product[];
  stock?: InventoryStock[];
  selectedBranchId?: string;
  onCreateProduct: (prod: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (id: string, prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  searchQuery: string;
  isDarkMode?: boolean;
  mode?: 'product-master' | 'all-stock';
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  stock = [],
  selectedBranchId = 'ALL',
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  searchQuery,
  isDarkMode = false,
  mode = 'product-master',
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterProductGroup, setFilterProductGroup] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [showZeroStock, setShowZeroStock] = useState<boolean>(mode === 'product-master');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [productGroup, setProductGroup] = useState<'Product Item' | 'Fixed Asset'>('Product Item');
  const [unit, setUnit] = useState<Product['unit']>('Pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(13);
  const [minReorderLevel, setMinReorderLevel] = useState<number>(10);
  const [requiresSerialTracking, setRequiresSerialTracking] = useState<boolean>(true);
  const [description, setDescription] = useState('');

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const effectiveSearch = localSearch || searchQuery;

  // Calculate total stock on hand for each product
  const getProductStockQty = (prodId: string) => {
    if (!stock || stock.length === 0) return 0;
    const items = stock.filter(
      (s) => s.productId === prodId && (selectedBranchId === 'ALL' || s.branchId === selectedBranchId)
    );
    return items.reduce((sum, item) => sum + item.quantityOnHand, 0);
  };

  const hiddenZeroStockCount = products.filter((p) => getProductStockQty(p.id) === 0).length;

  const filteredProducts = products.filter((p) => {
    const matchesCat = filterCategory === 'ALL' || p.category === filterCategory;
    const matchesGroup = filterProductGroup === 'ALL' || (p.productGroup || 'Product Item') === filterProductGroup;
    const matchesSearch =
      !effectiveSearch ||
      p.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(effectiveSearch.toLowerCase());

    const totalQty = getProductStockQty(p.id);
    const matchesStockFilter = showZeroStock || totalQty > 0;

    return matchesCat && matchesGroup && matchesSearch && matchesStockFilter;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setSku(`IZ-${Math.floor(100000 + Math.random() * 900000)}`);
    setBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    setName('');
    setCategory('Electronics');
    setProductGroup('Product Item');
    setUnit('Pcs');
    setCostPrice(1000);
    setSellingPrice(1300);
    setTaxRate(13);
    setMinReorderLevel(10);
    setRequiresSerialTracking(true);
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setBarcode(p.barcode);
    setName(p.name);
    setCategory(p.category);
    setProductGroup(p.productGroup || 'Product Item');
    setUnit(p.unit);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setTaxRate(p.taxRate);
    setMinReorderLevel(p.minReorderLevel);
    setRequiresSerialTracking(p.requiresSerialTracking !== false);
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      sku,
      barcode,
      name,
      category,
      productGroup,
      unit,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate),
      minReorderLevel: Number(minReorderLevel),
      requiresSerialTracking,
      trackingType: (requiresSerialTracking ? 'SERIAL_MAC_PON' : 'QUANTITY_ONLY') as 'SERIAL_MAC_PON' | 'QUANTITY_ONLY',
      description,
    };

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, payload);
    } else {
      await onCreateProduct(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden space-y-4">
      {/* Header bar */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Package className="h-5 w-5 text-indigo-500" />
            <span>{mode === 'product-master' ? 'Product Master Page' : 'All Available Stock Inventory'}</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {mode === 'product-master'
              ? 'Master SKU catalog specification: Product Name, Barcode, Group (Fixed Asset/Item), Category, UoM, Cost & Selling Price, VAT %, and Reorder levels.'
              : 'Live multi-branch inventory stock overview: on-hand balances, warehouse locations, and zero-stock filters.'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product SKU</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className={`flex-none flex flex-col md:flex-row items-center justify-between gap-2 p-2 rounded-xl border shadow-2xs ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Scan Barcode or Search Product Name / SKU:"
            className={`w-full rounded-lg border pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowZeroStock(!showZeroStock)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
              showZeroStock
                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600/40 hover:bg-amber-100'
                : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/40 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {showZeroStock ? 'All Stock List' : 'Available Stock (>0)'}
            </span>
            {!showZeroStock && hiddenZeroStockCount > 0 && (
              <span className="rounded-full bg-emerald-200 dark:bg-emerald-900/90 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
                {hiddenZeroStockCount} Zero-Qty Hidden
              </span>
            )}
          </button>

          <Filter className="h-3.5 w-3.5 text-slate-400 ml-1" />
          <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Group:</span>
          <select
            value={filterProductGroup}
            onChange={(e) => setFilterProductGroup(e.target.value)}
            className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">All Groups</option>
            <option value="Product Item">Product Item</option>
            <option value="Fixed Asset">Fixed Asset</option>
          </select>

          <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">All Categories ({products.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table with Frozen Header and Scrollable Body */}
      <div className={`flex-1 min-h-0 flex flex-col rounded-xl border shadow-md overflow-hidden ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex-1 min-h-0 overflow-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b shadow-2xs ${
              isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit">Product SKU / Barcode</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit">Product Details</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit">Product Group</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit">Category</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-center">Tracking Mode</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-center">Available Stock</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit">Unit</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-right">Cost Price (NPR)</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-right">Selling Price (NPR)</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-center">VAT Rate</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-right">Min Reorder</th>
                <th className="px-2.5 py-1.5 sticky top-0 bg-inherit text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-500 text-xs">
                    No matching available stock items found. Toggle "Available Stock (&gt;0)" to view all stock items including zero-stock products.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const qtyOnHand = getProductStockQty(p.id);
                  const grp = p.productGroup || 'Product Item';
                  return (
                    <tr key={p.id} className={`transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="px-2.5 py-1.5">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.sku}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Barcode className="h-3 w-3" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <div className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                        {p.description && (
                          <div className={`text-[10px] line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.description}</div>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          grp === 'Fixed Asset'
                            ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                        }`}>
                          {grp}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                          isDarkMode
                            ? 'bg-slate-900 text-slate-300 border-slate-800'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-center">
                        {p.requiresSerialTracking !== false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Barcode className="h-3 w-3" />
                            Serial/MAC/PON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Layers className="h-3 w-3" />
                            Qty Only (Bulk)
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-mono font-extrabold border ${
                            qtyOnHand > p.minReorderLevel
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                              : qtyOnHand > 0
                              ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                          }`}
                        >
                          {qtyOnHand} {p.unit}
                        </span>
                      </td>
                      <td className={`px-2.5 py-1.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{p.unit}</td>
                      <td className={`px-2.5 py-1.5 text-right font-mono font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        रु {p.costPrice.toLocaleString()}
                      </td>
                      <td className={`px-2.5 py-1.5 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        रु {p.sellingPrice.toLocaleString()}
                      </td>
                      <td className="px-2.5 py-1.5 text-center">
                        <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {p.taxRate}%
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {p.minReorderLevel} {p.unit}
                      </td>
                      <td className="px-2.5 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            title="Delete Product"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden my-8 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <div className={`flex items-center justify-between border-b p-4 ${
              isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {editingProduct ? 'Edit Product SKU' : 'Create New Product SKU'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Barcode
                  </label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1 opacity-80">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dell Latitude Laptop 15-inch"
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Product Group
                  </label>
                  <select
                    value={productGroup}
                    onChange={(e) => {
                      const val = e.target.value as 'Product Item' | 'Fixed Asset';
                      setProductGroup(val);
                      if (val === 'Fixed Asset') {
                        setMinReorderLevel(0);
                      }
                    }}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <option value="Product Item">Product Item</option>
                    <option value="Fixed Asset">Fixed Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    list="product-categories-list"
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      if (newCat.toLowerCase().includes('asset') || newCat.toLowerCase().includes('fixed')) {
                        setMinReorderLevel(0);
                      }
                    }}
                    placeholder="e.g. Fixed Assets, Electronics, Furniture"
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                  <datalist id="product-categories-list">
                    <option value="Fixed Assets" />
                    <option value="Electronics" />
                    <option value="Furniture" />
                    <option value="Office Supplies" />
                    <option value="Machinery & Equipment" />
                    <option value="IT Hardware" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Box">Box</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Set">Set</option>
                    <option value="Mtr">Mtr (Meters)</option>
                    <option value="Roll">Roll</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Cost Price (NPR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Selling Price (NPR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    VAT %
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1 opacity-80">
                  Minimum Stock Reorder Threshold
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={minReorderLevel}
                  onChange={(e) => setMinReorderLevel(Math.max(0, Number(e.target.value)))}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Accepts 0 for Fixed Asset type products or non-reorder items.
                </p>
              </div>

              {/* Serial / MAC Tracking Mode Toggle */}
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'border-indigo-900/40 bg-indigo-950/20' : 'border-indigo-200 bg-indigo-50/50'
              }`}>
                <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
                  <Barcode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Item Serial / MAC / PON Tracking Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label
                    onClick={() => setRequiresSerialTracking(true)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      requiresSerialTracking
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serialTrackingMode"
                      checked={requiresSerialTracking}
                      onChange={() => setRequiresSerialTracking(true)}
                      className="sr-only"
                    />
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${requiresSerialTracking ? 'text-white' : 'opacity-0'}`} />
                    <div>
                      <div>Serialized Device</div>
                      <div className={`text-[10px] font-normal ${requiresSerialTracking ? 'text-indigo-100' : 'text-slate-500'}`}>
                        Routers, STBs, OLTs, Switches, Servers
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setRequiresSerialTracking(false)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      !requiresSerialTracking
                        ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serialTrackingMode"
                      checked={!requiresSerialTracking}
                      onChange={() => setRequiresSerialTracking(false)}
                      className="sr-only"
                    />
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${!requiresSerialTracking ? 'text-white' : 'opacity-0'}`} />
                    <div>
                      <div>Bulk / Quantity Only</div>
                      <div className={`text-[10px] font-normal ${!requiresSerialTracking ? 'text-emerald-100' : 'text-slate-500'}`}>
                        Cables, Drop wire, RJ45, Fasteners
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1 opacity-80">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details..."
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    isDarkMode
                      ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
