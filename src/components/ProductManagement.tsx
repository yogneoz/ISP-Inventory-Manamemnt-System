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
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [showZeroStock, setShowZeroStock] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [unit, setUnit] = useState<Product['unit']>('Pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(13);
  const [minReorderLevel, setMinReorderLevel] = useState<number>(10);
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
    const matchesSearch =
      !effectiveSearch ||
      p.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(effectiveSearch.toLowerCase());

    const totalQty = getProductStockQty(p.id);
    const matchesStockFilter = showZeroStock || totalQty > 0;

    return matchesCat && matchesSearch && matchesStockFilter;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setSku(`IZ-${Math.floor(100000 + Math.random() * 900000)}`);
    setBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    setName('');
    setCategory('Electronics');
    setUnit('Pcs');
    setCostPrice(1000);
    setSellingPrice(1300);
    setTaxRate(13);
    setMinReorderLevel(10);
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setBarcode(p.barcode);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setTaxRate(p.taxRate);
    setMinReorderLevel(p.minReorderLevel);
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, {
        sku,
        barcode,
        name,
        category,
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        taxRate: Number(taxRate),
        minReorderLevel: Number(minReorderLevel),
        description,
      });
    } else {
      await onCreateProduct({
        sku,
        barcode,
        name,
        category,
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        taxRate: Number(taxRate),
        minReorderLevel: Number(minReorderLevel),
        description,
      });
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
            <span>Product Master Catalog</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage product SKUs, tax rates (13% VAT), cost prices, and minimum stock reorder levels.
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
      <div className={`flex-none flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-sm ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by SKU, Barcode, or Name..."
            className={`w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
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
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
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

          <Filter className="h-4 w-4 text-slate-400 ml-1" />
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer ${
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
      <div className={`flex-1 min-h-0 flex flex-col rounded-2xl border shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex-1 min-h-0 overflow-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b shadow-xs ${
              isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="p-3.5 sticky top-0 bg-inherit">Product SKU / Barcode</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Product Details</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Category</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-center">Available Stock</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Unit</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-right">Cost Price (NPR)</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-right">Selling Price (NPR)</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-center">VAT Rate</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-right">Min Reorder</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 text-xs">
                    No matching available stock items found. Toggle "Available Stock (&gt;0)" to view all stock items including zero-stock products.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const qtyOnHand = getProductStockQty(p.id);
                  return (
                    <tr key={p.id} className={`transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.sku}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Barcode className="h-3 w-3" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                        {p.description && (
                          <div className={`text-[11px] line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.description}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                          isDarkMode
                            ? 'bg-slate-900 text-slate-300 border-slate-800'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-extrabold border ${
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
                      <td className={`p-3.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{p.unit}</td>
                      <td className={`p-3.5 text-right font-mono font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        रु {p.costPrice.toLocaleString()}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        रु {p.sellingPrice.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {p.taxRate}%
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {p.minReorderLevel} {p.unit}
                      </td>
                      <td className="p-3.5 text-center">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-80">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Electronics, Furniture"
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                      isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
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
                  min={1}
                  value={minReorderLevel}
                  onChange={(e) => setMinReorderLevel(Number(e.target.value))}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
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
