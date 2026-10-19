import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  X, RefreshCw, Key, Image as ImageIcon, Trash2, Plus, 
  Package, Check, FileText, ChevronRight, Eye
} from 'lucide-react';
import { useProductStore } from '../../store/useProductStore';
import { usePurchaseStore } from '../../store/usePurchaseStore';
import { matchCatalogItem } from '../../lib/catalogMatcher';
import { 
  preprocessImage, extractBillWithGemini, DEMO_PURCHASE_BILLS, 
  type ExtractedBill, type ExtractedBillItem 
} from '../../lib/billExtractor';
import type { PurchaseInvoiceItem, UnitType, GstRate } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PurchaseBillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

type ScanStep = 'CAPTURE' | 'PROCESSING' | 'REVIEW' | 'SUCCESS';

interface ReviewItemState extends PurchaseInvoiceItem {
  confidence: number;
  matchReason: string;
  previousRate?: number;
  percentChange?: number;
}

export const PurchaseBillScannerModal: React.FC<PurchaseBillScannerModalProps> = ({
  isOpen,
  onClose,
  onToast
}) => {
  const { products } = useProductStore();
  const { inwardPurchaseInvoice, geminiApiKey, setGeminiApiKey } = usePurchaseStore();

  const [step, setStep] = useState<ScanStep>('CAPTURE');
  const [processingStatus, setProcessingStatus] = useState<string>('Preparing image...');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Review State
  const [supplierData, setSupplierData] = useState({
    name: '',
    mobile: '',
    gstin: '',
    address: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10)
  });
  const [reviewItems, setReviewItems] = useState<ReviewItemState[]>([]);
  const [inwardResult, setInwardResult] = useState<{
    invoiceId: string;
    updatedCount: number;
    createdCount: number;
    totalStockAdded: number;
  } | null>(null);

  // Key configuration toggle
  const [isConfiguringKey, setIsConfiguringKey] = useState(false);
  const [keyInput, setKeyInput] = useState(geminiApiKey || '');

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Stop camera when modal closes or step changes
  useEffect(() => {
    if (!isOpen || step !== 'CAPTURE') {
      stopCamera();
    }
  }, [isOpen, step]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access not available:', err);
      setCameraError('Camera access unavailable. You can upload an invoice image or try a demo bill.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    processCapturedImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      processCapturedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectDemoBill = (demoId: string) => {
    const demo = DEMO_PURCHASE_BILLS.find(d => d.id === demoId);
    if (!demo) return;

    setCapturedImage(null);
    setStep('PROCESSING');
    setProcessingStatus('Simulating AI bill extraction from wholesale distributor invoice...');

    setTimeout(() => {
      loadExtractedBillIntoReview(demo.bill);
    }, 900);
  };

  const processCapturedImage = async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setStep('PROCESSING');
    setProcessingStatus('Enhancing document contrast & perspective...');

    try {
      const preprocessed = await preprocessImage(dataUrl, 1600);

      // Check if Gemini API key exists
      if (geminiApiKey.trim()) {
        setProcessingStatus('Reading invoice lines, rates & GST with Gemini 2.0 Flash Vision...');
        const extracted = await extractBillWithGemini(preprocessed.base64, preprocessed.mimeType, geminiApiKey.trim());
        loadExtractedBillIntoReview(extracted);
      } else {
        // Fallback to high-fidelity demo parser with friendly toast notice
        setProcessingStatus('Parsing invoice table and matching shop catalog...');
        setTimeout(() => {
          onToast('info', 'Sample AI Parser Active', 'To parse custom bills live, enter your free Google Gemini API key in Settings.');
          // Use Chandra demo as base
          loadExtractedBillIntoReview(DEMO_PURCHASE_BILLS[0].bill);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      onToast('error', 'AI Extraction Error', err?.message || 'Could not parse bill');
      setStep('CAPTURE');
    }
  };

  const loadExtractedBillIntoReview = (bill: ExtractedBill) => {
    setSupplierData({
      name: bill.supplier.name,
      mobile: bill.supplier.mobile || '',
      gstin: bill.supplier.gstin || '',
      address: bill.supplier.address || '',
      invoiceNumber: bill.supplier.invoiceNumber,
      invoiceDate: bill.supplier.invoiceDate
    });

    // Run each item through the Smart Catalog Matcher
    const mappedItems: ReviewItemState[] = bill.items.map((it, idx) => {
      const match = matchCatalogItem(
        {
          rawName: it.rawName,
          barcode: it.barcode,
          sku: it.sku,
          hsnCode: it.hsnCode,
          purchaseRate: it.purchaseRate,
          mrp: it.mrp
        },
        products
      );

      return {
        id: `rev_${idx}_${Date.now()}`,
        productId: match.matchedProduct ? match.matchedProduct.id : undefined,
        rawName: it.rawName,
        matchedProductName: match.matchedProduct ? match.matchedProduct.name : it.rawName,
        hsnCode: it.hsnCode || match.matchedProduct?.hsnCode || '4820',
        qty: it.quantity,
        freeQty: it.freeQuantity || 0,
        unit: it.unit || match.matchedProduct?.unit || 'Pcs',
        purchaseRate: it.purchaseRate,
        mrp: it.mrp || match.matchedProduct?.mrp || Math.round(it.purchaseRate * 1.35),
        saleRate: match.matchedProduct?.saleRate || it.mrp,
        discountPct: it.discountPct || 0,
        gstRate: it.gstRate,
        totalAmount: it.totalAmount,
        isNewProduct: match.isNewProduct,
        confidence: Math.round(match.confidence * 100),
        matchReason: match.matchReason,
        previousRate: match.rateDifference?.previousRate,
        percentChange: match.rateDifference?.percentChange
      };
    });

    setReviewItems(mappedItems);
    setStep('REVIEW');
  };

  const handleUpdateItem = (index: number, updates: Partial<ReviewItemState>) => {
    setReviewItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleToggleNewProduct = (index: number) => {
    setReviewItems(prev => {
      const copy = [...prev];
      const current = copy[index];
      const toggled = !current.isNewProduct;
      copy[index] = {
        ...current,
        isNewProduct: toggled,
        productId: toggled ? undefined : current.productId
      };
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    setReviewItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const newItem: ReviewItemState = {
      id: `rev_man_${Date.now()}`,
      rawName: 'Manual Entry Item',
      matchedProductName: 'Manual Entry Item',
      hsnCode: '4820',
      qty: 10,
      freeQty: 0,
      unit: 'Pcs',
      purchaseRate: 50,
      mrp: 75,
      saleRate: 70,
      gstRate: 12,
      totalAmount: 500,
      isNewProduct: true,
      confidence: 100,
      matchReason: 'manual'
    };
    setReviewItems(prev => [...prev, newItem]);
  };

  const handleConfirmInward = async () => {
    if (!supplierData.name.trim()) {
      onToast('error', 'Supplier Name Required', 'Please enter distributor or supplier business name.');
      return;
    }
    if (!supplierData.invoiceNumber.trim()) {
      onToast('error', 'Bill Number Required', 'Please enter the purchase invoice / bill number.');
      return;
    }
    if (reviewItems.length === 0) {
      onToast('error', 'No Items to Inward', 'Bill contains zero items.');
      return;
    }

    try {
      setProcessingStatus('Executing atomic stock inwarding & updating balances...');
      setStep('PROCESSING');

      const result = await inwardPurchaseInvoice({
        supplier: supplierData,
        items: reviewItems,
        billImageUrl: capturedImage || undefined
      });

      setInwardResult(result);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Inwarding error:', err);
      onToast('error', 'Inwarding Failed', err?.message || 'Could not inward stock.');
      setStep('REVIEW');
    }
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(keyInput);
    setIsConfiguringKey(false);
    onToast('success', 'Gemini API Key Saved', 'You can now scan custom purchase bills live with Google Vision AI.');
  };

  const handleReset = () => {
    stopCamera();
    setStep('CAPTURE');
    setCapturedImage(null);
    setReviewItems([]);
    setInwardResult(null);
  };

  // Calculations for review screen
  const totalInwardQty = reviewItems.reduce((acc, it) => acc + Number(it.qty || 0) + Number(it.freeQty || 0), 0);
  const totalSubtotal = reviewItems.reduce((acc, it) => acc + (Number(it.qty || 0) * Number(it.purchaseRate || 0)), 0);
  const totalTax = reviewItems.reduce((acc, it) => acc + (Number(it.qty || 0) * Number(it.purchaseRate || 0) * (Number(it.gstRate || 0) / 100)), 0);
  const totalGrand = Math.round((totalSubtotal + totalTax) * 100) / 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs font-sans text-[#172B4D] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#D8E1EC]">
        {/* Header Bar */}
        <div className="p-3 sm:p-4 bg-[#F5F9FF] border-b border-[#D8E1EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2563EB] text-white rounded-xl shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#172B4D] flex items-center gap-1.5">
                AI Purchase Bill Scanner
                <span className="text-[10px] bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded-full font-bold">
                  Vision AI
                </span>
              </h2>
              <p className="text-[11px] text-[#64748B]">
                {step === 'CAPTURE' && 'Scan supplier invoice photo to automatically extract and inward stock'}
                {step === 'PROCESSING' && 'Analyzing bill structure, reading line items & matching catalog'}
                {step === 'REVIEW' && 'Review extracted supplier bill & verify catalog stock updates'}
                {step === 'SUCCESS' && 'Purchase bill inwarded and inventory updated'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {step === 'CAPTURE' && (
              <button
                type="button"
                onClick={() => setIsConfiguringKey(!isConfiguringKey)}
                className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-white rounded-lg border border-transparent hover:border-[#D8E1EC] transition-colors cursor-pointer"
                title="Configure Gemini API Key"
              >
                <Key className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="p-1.5 text-[#64748B] hover:text-[#B91C1C] hover:bg-white rounded-lg border border-transparent hover:border-[#D8E1EC] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Drawer */}
        {isConfiguringKey && step === 'CAPTURE' && (
          <div className="p-3 bg-[#FEF3C7] border-b border-[#FDE68A] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex-1 w-full">
              <div className="font-bold text-[#92400E] flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Google Gemini Flash API Key (Optional)
              </div>
              <p className="text-[10px] text-[#78350F] mt-0.5">
                Get a 100% free API key from aistudio.google.com to scan real paper bills live.
              </p>
              <input
                type="password"
                placeholder="Paste AI Studio Key (AIzaSy...)"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full mt-1.5 px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer hover:bg-[#1D4ED8]"
              >
                Save Key
              </button>
              <button
                type="button"
                onClick={() => setIsConfiguringKey(false)}
                className="px-2 py-1.5 bg-white text-[#64748B] rounded-lg font-semibold text-xs border border-[#D8E1EC] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Content Step Viewport */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5">
          {/* STEP 1: CAPTURE */}
          {step === 'CAPTURE' && (
            <div className="space-y-4">
              {/* Camera Viewfinder or Prompt */}
              {isCameraActive ? (
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-4/3 max-h-[380px] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Visual Alignment Bounding Guide */}
                  <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-[#2563EB]/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded self-start font-mono">
                      Align bill edges within frame
                    </span>
                    <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded self-end font-mono">
                      Ensure good lighting
                    </span>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCaptureFromCamera}
                      className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-full shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-transform text-xs"
                    >
                      <Camera className="w-4 h-4" /> Snap Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-black/70 hover:bg-black text-white font-semibold rounded-full text-xs cursor-pointer"
                    >
                      Cancel Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 sm:p-8 text-center bg-[#F8FAFC] space-y-4">
                  <div className="w-14 h-14 bg-[#DBEAFE] text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#172B4D]">
                      Scan Physical Purchase Bill
                    </h3>
                    <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                      Take a photo of wholesale bills, Tally/Marg printouts, or tax invoices. AI extracts items and updates stock immediately.
                    </p>
                  </div>

                  {cameraError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" /> Open Camera Viewfinder
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white hover:bg-[#F1F5F9] text-[#172B4D] border border-[#D8E1EC] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Upload className="w-4 h-4 text-[#64748B]" /> Upload Photo / PDF
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Instant 1-Tap Demo Bills Section */}
              <div className="p-4 bg-[#F5F9FF] border border-[#D8E1EC] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" /> Instant 1-Tap Demo Bills (Test Without Camera)
                  </div>
                  <span className="text-[10px] text-[#64748B] font-medium hidden sm:inline">
                    Simulate real wholesale distributor invoices
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_PURCHASE_BILLS.map((demo) => (
                    <div
                      key={demo.id}
                      onClick={() => handleSelectDemoBill(demo.id)}
                      className="p-3 bg-white border border-[#D8E1EC] hover:border-[#2563EB] hover:shadow-md rounded-xl cursor-pointer transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#172B4D] group-hover:text-[#2563EB] transition-colors">
                            {demo.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#15803D] bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                            {formatCurrency(demo.bill.totals.grandTotal)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">
                          {demo.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 text-[10px] text-[#64748B]">
                        <span>{demo.bill.items.length} Line Items</span>
                        <span className="text-[#2563EB] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Test Scan <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING ANIMATION */}
          {step === 'PROCESSING' && (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#DBEAFE] border-t-[#2563EB] rounded-full animate-spin mx-auto" />
                <Sparkles className="w-6 h-6 text-[#2563EB] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#172B4D]">
                  Processing Bill with Vision AI
                </h3>
                <p className="text-xs text-[#2563EB] font-mono mt-1 animate-pulse">
                  {processingStatus}
                </p>
              </div>
              <p className="text-[11px] text-[#64748B] max-w-sm mx-auto">
                Extracting supplier details, item quantities, free scheme units, purchase rates, and matching to your shop catalog...
              </p>
            </div>
          )}

          {/* STEP 3: POKA-YOKE REVIEW SCREEN */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Supplier & Bill Info Card */}
              <div className="p-3 sm:p-4 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl">
                <div className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Distributor / Supplier Details</span>
                  <span className="text-[11px] text-[#2563EB] font-mono">Editable</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Supplier Name *</label>
                    <input
                      type="text"
                      value={supplierData.name}
                      onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-bold text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Invoice / Bill # *</label>
                    <input
                      type="text"
                      value={supplierData.invoiceNumber}
                      onChange={(e) => setSupplierData({ ...supplierData, invoiceNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono font-bold text-[#2563EB] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Invoice Date</label>
                    <input
                      type="date"
                      value={supplierData.invoiceDate}
                      onChange={(e) => setSupplierData({ ...supplierData, invoiceDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Supplier GSTIN</label>
                    <input
                      type="text"
                      value={supplierData.gstin}
                      onChange={(e) => setSupplierData({ ...supplierData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 23AAAAA0000A1Z5"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Extracted Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#2563EB]" /> Extracted Items ({reviewItems.length} lines)
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#1E40AF] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {reviewItems.map((item, idx) => {
                    const isMatched = !item.isNewProduct && item.productId;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isMatched
                            ? 'bg-white border-[#D8E1EC] hover:border-[#2563EB]'
                            : 'bg-[#FAF5FF] border-[#E9D5FF] hover:border-[#A855F7]'
                        }`}
                      >
                        {/* Item Header & Match Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono text-[#64748B] bg-gray-100 px-1.5 py-0.5 rounded font-bold">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-[#172B4D] truncate">
                                {item.rawName}
                              </span>
                              {isMatched ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                  <Check className="w-3 h-3" /> Matched: {item.matchedProductName} ({item.confidence}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                                  <Plus className="w-3 h-3" /> New Product (Will be added to catalog)
                                </span>
                              )}
                            </div>

                            {/* Catalog selector if user wants to change matching */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <label className="text-[10px] font-semibold text-[#64748B] shrink-0">Map to Catalog:</label>
                              <select
                                value={item.isNewProduct ? '__NEW__' : (item.productId || '__NEW__')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__NEW__') {
                                    handleUpdateItem(idx, { isNewProduct: true, productId: undefined });
                                  } else {
                                    const prod = products.find(p => p.id === val);
                                    if (prod) {
                                      handleUpdateItem(idx, {
                                        isNewProduct: false,
                                        productId: prod.id,
                                        matchedProductName: prod.name,
                                        hsnCode: prod.hsnCode,
                                        mrp: prod.mrp,
                                        saleRate: prod.saleRate,
                                        unit: prod.unit
                                      });
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-[#D8E1EC] rounded text-[11px] text-[#172B4D] max-w-xs truncate"
                              >
                                <option value="__NEW__">+ Create as New Catalog Item</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (Cur: {p.stockQty} {p.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-[#64748B] hover:text-[#B91C1C] rounded hover:bg-red-50 self-end sm:self-auto transition-colors cursor-pointer"
                            title="Remove line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Editable Rates & Quantities */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2.5 text-xs font-mono">
                          <div>
                            <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Billed Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(idx, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-2 py-1 bg-white border border-[#D8E1EC] rounded text-xs font-bold text-[#172B4D] text-right"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#15803D] uppercase mb-0.5">+ Free Qty</label>
                            <input
                              type="number"
                              min="0"
                              value={item.freeQty || 0}
                              onChange={(e) => handleUpdateItem(idx, { freeQty: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-full px-2 py-1 bg-green-50 border border-green-300 rounded text-xs font-bold text-[#15803D] text-right"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Purchase Rate ₹</label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.purchaseRate}
                              onChange={(e) => handleUpdateItem(idx, { purchaseRate: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-white border border-[#D8E1EC] rounded text-xs font-bold text-[#2563EB] text-right"
                            />
                            {item.percentChange !== undefined && item.percentChange !== 0 && (
                              <div className={`text-[9px] text-right mt-0.5 font-sans font-bold ${item.percentChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {item.percentChange > 0 ? `+${item.percentChange}%` : `${item.percentChange}%`} vs Prev
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">MRP ₹</label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.mrp}
                              onChange={(e) => handleUpdateItem(idx, { mrp: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-white border border-[#D8E1EC] rounded text-xs text-[#172B4D] text-right"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">GST %</label>
                            <select
                              value={item.gstRate}
                              onChange={(e) => handleUpdateItem(idx, { gstRate: parseInt(e.target.value) as GstRate })}
                              className="w-full px-2 py-1 bg-white border border-[#D8E1EC] rounded text-xs text-[#172B4D]"
                            >
                              {[0, 5, 12, 18, 28].map(g => (
                                <option key={g} value={g}>{g}%</option>
                              ))}
                            </select>
                          </div>

                          <div className="text-right">
                            <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-0.5">Total Line ₹</label>
                            <div className="py-1 text-xs font-black text-[#172B4D]">
                              {formatCurrency(Number(item.qty || 0) * Number(item.purchaseRate || 0))}
                            </div>
                            <div className="text-[9px] text-[#64748B] font-sans">
                              Net Stock: +{Number(item.qty || 0) + Number(item.freeQty || 0)} {item.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bill Totals Summary Bar */}
              <div className="p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#64748B] block text-[10px] uppercase font-bold">Total Inward Qty</span>
                    <strong className="text-sm font-black text-[#172B4D]">{totalInwardQty} Units</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px] uppercase font-bold">Taxable Subtotal</span>
                    <strong className="text-sm text-[#172B4D]">{formatCurrency(totalSubtotal)}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px] uppercase font-bold">GST Amount</span>
                    <strong className="text-sm text-[#172B4D]">{formatCurrency(totalTax)}</strong>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-[#64748B] block uppercase font-bold">Grand Bill Total</span>
                    <span className="text-lg font-black text-[#15803D] font-mono">
                      {formatCurrency(totalGrand)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS VIEW */}
          {step === 'SUCCESS' && inwardResult && (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-[#15803D] rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#172B4D]">
                  Purchase Bill Inwarded Successfully!
                </h3>
                <p className="text-xs text-[#64748B] mt-1 font-mono">
                  Bill #{supplierData.invoiceNumber} • {supplierData.name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs font-mono pt-2">
                <div className="p-3 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl">
                  <div className="text-lg font-black text-[#2563EB]">+{inwardResult.totalStockAdded}</div>
                  <div className="text-[10px] text-[#64748B] uppercase font-bold mt-0.5">Units Added</div>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl">
                  <div className="text-lg font-black text-[#15803D]">{inwardResult.updatedCount}</div>
                  <div className="text-[10px] text-[#64748B] uppercase font-bold mt-0.5">SKUs Updated</div>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl">
                  <div className="text-lg font-black text-[#7E22CE]">{inwardResult.createdCount}</div>
                  <div className="text-[10px] text-[#64748B] uppercase font-bold mt-0.5">New Products</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-white hover:bg-[#F5F9FF] text-[#172B4D] border border-[#D8E1EC] rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Scan Another Bill
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  View Inventory & Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Review step) */}
        {step === 'REVIEW' && (
          <div className="p-3 sm:p-4 bg-[#F5F9FF] border-t border-[#D8E1EC] flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#D8E1EC] rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Back / Rescan
            </button>

            <button
              type="button"
              onClick={handleConfirmInward}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Confirm & Inward Stock ({totalInwardQty} Units)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
