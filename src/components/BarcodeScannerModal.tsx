import React, { useState } from 'react';
import { X, QrCode, Barcode, Printer, Check, Scan, Search, Copy } from 'lucide-react';
import { Product, DeviceSerialPair } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  onScanResult?: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products = [],
  onScanResult,
}) => {
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'GENERATOR'>('SCANNER');
  const [scannedInput, setScannedInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);
  const [serialNumber, setSerialNumber] = useState('IZ-ONU-2081-8842');
  const [ponSerial, setPonSerial] = useState('ZTEG8A41B22F');
  const [macAddress, setMacAddress] = useState('00:1A:2B:3C:4D:5E');
  const [copied, setCopied] = useState(false);
  const [scanHistory, setScanHistory] = useState<
    { code: string; type: string; timestamp: string }[]
  >([
    { code: 'IZ-ONU-2081-8842', type: 'ONU Router Serial', timestamp: new Date().toLocaleTimeString() },
    { code: '8997011234567', type: 'Product SKU Barcode', timestamp: new Date().toLocaleTimeString() },
  ]);

  if (!isOpen) return null;

  const handleSimulateScan = (code: string) => {
    setScannedInput(code);
    const newEntry = { code, type: 'Scanned Code', timestamp: new Date().toLocaleTimeString() };
    setScanHistory([newEntry, ...scanHistory]);
    if (onScanResult) {
      onScanResult(code);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">IZone Serial & Barcode Scanner / Labeler</h3>
              <p className="text-xs text-slate-400">Scan router ONUs, STB serials, MAC addresses & print asset tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
          <button
            onClick={() => setActiveTab('SCANNER')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition-all ${
              activeTab === 'SCANNER'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scan className="h-4 w-4" />
            <span>Interactive Barcode Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('GENERATOR')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition-all ${
              activeTab === 'GENERATOR'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Print Asset Tag / Barcode Label</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'SCANNER' ? (
            <div className="space-y-6">
              {/* Camera Scanner Simulation Frame */}
              <div className="relative rounded-2xl border-2 border-dashed border-indigo-500/40 bg-slate-950 p-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-indigo-500/5 via-transparent to-indigo-500/5 pointer-events-none animate-pulse" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mb-3">
                  <Scan className="h-8 w-8 animate-bounce" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Ready to Scan Hardware Device Barcode</h4>
                <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                  Position device serial sticker (ONUs, STBs, Optical Fiber Reels) in front of laser barcode reader or type/click below to simulate scan.
                </p>

                {/* Input Simulation */}
                <div className="flex gap-2 max-w-md mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Scan or enter Serial / Barcode..."
                      value={scannedInput}
                      onChange={(e) => setScannedInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && scannedInput.trim()) {
                          handleSimulateScan(scannedInput.trim());
                        }
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => scannedInput.trim() && handleSimulateScan(scannedInput.trim())}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all cursor-pointer"
                  >
                    Register Scan
                  </button>
                </div>

                {/* Preset Quick Scan Buttons */}
                <div className="mt-4 flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 self-center mr-1">Quick Test Scans:</span>
                  {[
                    'IZ-ONU-DualBand-9941',
                    'STB-4K-NEP-2081-3310',
                    'PON-ZTEG9988A11B',
                    'FIBER-REEL-200M-A1',
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSimulateScan(preset)}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-mono text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan Log History */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Recent Device Scan Buffer ({scanHistory.length})
                </h4>
                <div className="rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/60 max-h-40 overflow-y-auto">
                  {scanHistory.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No barcodes scanned yet.</div>
                  ) : (
                    scanHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Barcode className="h-4 w-4 text-indigo-400" />
                          <span className="font-mono font-bold text-white">{item.code}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">{item.timestamp}</span>
                          <button
                            onClick={() => handleCopy(item.code)}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Barcode & Asset Tag Generator & Label Print View */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Select Device / Product
                  </label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const found = products.find((p) => p.id === e.target.value);
                      if (found) setSelectedProduct(found);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Device Serial Number
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    PON Serial (Optional)
                  </label>
                  <input
                    type="text"
                    value={ponSerial}
                    onChange={(e) => setPonSerial(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    MAC Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Official Printable Tag Preview Box */}
              <div className="border border-slate-700 rounded-2xl bg-white text-slate-900 p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider text-rose-700 uppercase">
                      IZone Digital Network Pvt. Ltd.
                    </span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      PROPERTY OF IZONE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">NEPAL TELECOM COMPLIANT</span>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="col-span-2 space-y-1">
                    <div className="text-xs font-bold text-slate-900 uppercase">
                      {selectedProduct?.name || 'Dual Band ONU Router (Fiber)'}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      SKU: {selectedProduct?.sku || 'IZ-ONT-DB01'} | Barcode: {selectedProduct?.barcode || '8997011234567'}
                    </div>
                    <div className="text-xs font-bold font-mono text-indigo-950 pt-1">
                      S/N: <span className="bg-amber-100 px-1 rounded border border-amber-300">{serialNumber}</span>
                    </div>
                    {ponSerial && (
                      <div className="text-[11px] font-mono text-slate-700">
                        PON: <span className="font-bold">{ponSerial}</span>
                      </div>
                    )}
                    {macAddress && (
                      <div className="text-[11px] font-mono text-slate-700">
                        MAC: <span className="font-bold">{macAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Simulated Visual Barcode Visual Representation */}
                  <div className="flex flex-col items-center justify-center border-l border-slate-200 pl-4">
                    <div className="flex h-12 w-full items-center justify-center gap-0.5 bg-slate-100 p-1 rounded border border-slate-300">
                      {[3, 1, 4, 1, 5, 2, 1, 3, 2, 4, 1, 2, 3, 1, 5, 2, 1, 4].map((w, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 h-full"
                          style={{ width: `${w * 2}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 mt-1 font-bold">
                      *{serialNumber}*
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-4">
          {activeTab === 'SCANNER' ? (
            <div className="text-xs text-slate-400">
              Scanned items can be auto-filled in Purchase Invoices & Device Serials.
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Printer className="h-4 w-4 text-indigo-400" />
              <span>Label dimension: Standard 4x2 inch thermal sticker tag</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            {activeTab === 'GENERATOR' && (
              <button
                onClick={handlePrintLabel}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Thermal Tag</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
