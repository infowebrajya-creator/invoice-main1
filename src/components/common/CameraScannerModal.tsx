import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Zap, ZapOff, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<'native' | 'zxing'>('zxing');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<{ code: string; format: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMessage(null);
    setHasCameraPermission(null);

    // Verify browser mediaDevices support (requires HTTPS or localhost on iOS Safari)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        'Live camera access requires HTTPS or localhost on iPhone/iOS Safari. You can use "Snap Photo with iOS Camera" below to scan immediately.'
      );
      setHasCameraPermission(false);
      return;
    }

    try {
      // iOS WebKit Resilient Video Constraints
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback for older iOS / iPadOS WebKit releases
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        // Crucial iOS Safari WebKit properties: must be set before play()
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.srcObject = stream;

        try {
          await video.play();
        } catch (playErr) {
          console.warn('[Camera] Video play() initial promise warning:', playErr);
        }
      }

      setHasCameraPermission(true);

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      startDetection();
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Camera access was denied. Please allow camera permissions in Safari / Chrome settings, or tap "Snap Photo with iOS Camera" below.'
        );
      } else {
        setErrorMessage('Could not start video stream. You can snap a photo of the barcode instead.');
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (e) {
        // Ignore reset error
      }
      zxingReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsTorchOn(false);
    setHasTorch(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const playBeep = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(60);
      }
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const handleSuccessfulBarcode = (rawScannedText: string, formatName?: string) => {
    // Clean string: strip quiet-zone arrows (e.g. '>'), spaces, or special margin marks
    const cleanDigits = rawScannedText.replace(/[\s>]+/g, '').trim();
    if (!cleanDigits) return;

    playBeep();
    setSuccessResult({
      code: cleanDigits,
      format: formatName || (cleanDigits.length === 13 ? 'EAN-13' : '1D Barcode')
    });

    // Provide immediate visual feedback on the detected barcode number before closing
    setTimeout(() => {
      onScan(cleanDigits);
      onClose();
    }, 650);
  };

  const startDetection = () => {
    let isHandled = false;

    // Viewfinder Canvas Buffers for ROI (Region of Interest) cropping
    const cropCanvas = document.createElement('canvas');
    const rotCanvas = document.createElement('canvas');
    const mirrorCanvas = document.createElement('canvas');
    const rotMirrorCanvas = document.createElement('canvas');

    // 1. Setup Native Android Hardware BarcodeDetector if supported
    let nativeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
        });
        setActiveEngine('native');
      } catch (e) {
        nativeDetector = null;
      }
    }

    // 2. Setup ZXing MultiFormatReader (Universal / iOS Safari engine)
    let zxingReader: BrowserMultiFormatReader | null = null;
    try {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      zxingReader = new BrowserMultiFormatReader(hints);
      zxingReaderRef.current = zxingReader;
      if (!nativeDetector) {
        setActiveEngine('zxing');
      }
    } catch (zxingErr) {
      console.warn('ZXing init error:', zxingErr);
    }

    // Continuous Frame Detection with Center Viewfinder Isolation
    let lastScanTime = 0;
    const detectFrame = async (timestamp: number) => {
      if (isHandled) return;

      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Throttle scanning to ~12-15 fps to prevent CPU/battery strain
      if (timestamp - lastScanTime < 65) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      lastScanTime = timestamp;

      const video = videoRef.current;
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      // Extract Center Viewfinder Area ONLY (matches the on-screen reticle box)
      const cw = Math.max(180, Math.round(vw * 0.70));
      const ch = Math.max(120, Math.round(vh * 0.55));
      const cx = Math.max(0, Math.round((vw - cw) / 2));
      const cy = Math.max(0, Math.round((vh - ch) / 2));

      cropCanvas.width = cw;
      cropCanvas.height = ch;
      const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

      if (cropCtx) {
        // Draw only the barcode area inside the viewfinder (ignores background text, MRP, batch numbers)
        cropCtx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);

        // Prepare 90° rotated canvas for vertical barcodes (e.g. face wash tubes, cosmetics, books)
        rotCanvas.width = ch;
        rotCanvas.height = cw;
        const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
        if (rotCtx) {
          rotCtx.translate(ch / 2, cw / 2);
          rotCtx.rotate((90 * Math.PI) / 180);
          rotCtx.drawImage(cropCanvas, -cw / 2, -ch / 2);
        }

        // Prepare mirrored canvases for front camera scanning
        let mirrorCtx: CanvasRenderingContext2D | null = null;
        let rotMirrorCtx: CanvasRenderingContext2D | null = null;
        if (facingMode === 'user') {
          mirrorCanvas.width = cw;
          mirrorCanvas.height = ch;
          mirrorCtx = mirrorCanvas.getContext('2d', { willReadFrequently: true });
          if (mirrorCtx) {
            mirrorCtx.translate(cw, 0);
            mirrorCtx.scale(-1, 1);
            mirrorCtx.drawImage(cropCanvas, 0, 0);
          }

          rotMirrorCanvas.width = ch;
          rotMirrorCanvas.height = cw;
          rotMirrorCtx = rotMirrorCanvas.getContext('2d', { willReadFrequently: true });
          if (rotMirrorCtx && mirrorCtx) {
            rotMirrorCtx.translate(ch / 2, cw / 2);
            rotMirrorCtx.rotate((90 * Math.PI) / 180);
            rotMirrorCtx.drawImage(mirrorCanvas, -cw / 2, -ch / 2);
          }
        }

        let detectedText: string | null = null;
        let detectedFormatName: string = 'EAN-13';

        // PASS 1: Native BarcodeDetector
        if (nativeDetector) {
          try {
            // Check horizontal crop
            let barcodes = await nativeDetector.detect(cropCanvas);
            // Check mirrored horizontal if front camera
            if ((!barcodes || barcodes.length === 0) && mirrorCtx) {
              barcodes = await nativeDetector.detect(mirrorCanvas);
            }
            // Check vertical 90° rotated crop if not found horizontally
            if ((!barcodes || barcodes.length === 0) && rotCtx) {
              barcodes = await nativeDetector.detect(rotCanvas);
            }
            // Check vertical mirrored crop
            if ((!barcodes || barcodes.length === 0) && rotMirrorCtx) {
              barcodes = await nativeDetector.detect(rotMirrorCanvas);
            }
            // Fallback: full frame if item is slightly off-center
            if (!barcodes || barcodes.length === 0) {
              barcodes = await nativeDetector.detect(video);
            }

            if (barcodes && barcodes.length > 0) {
              const match = barcodes.find((b: any) => b.rawValue && b.rawValue.trim());
              if (match) {
                detectedText = match.rawValue.trim();
                detectedFormatName = match.format ? match.format.toUpperCase().replace('_', '-') : 'EAN-13';
              }
            }
          } catch (e) {
            // Frame skip
          }
        }

        // PASS 2: Universal ZXing Reader
        if (!detectedText && zxingReader) {
          try {
            const res = zxingReader.decode(cropCanvas as any);
            if (res && res.getText()) {
              detectedText = res.getText().trim();
              detectedFormatName = res.getBarcodeFormat() ? BarcodeFormat[res.getBarcodeFormat()] : 'EAN-13';
            }
          } catch (e) {
            // Not found in horizontal crop
          }

          // Try mirrored horizontal crop if front camera
          if (!detectedText && mirrorCtx) {
            try {
              const res = zxingReader.decode(mirrorCanvas as any);
              if (res && res.getText()) {
                detectedText = res.getText().trim();
                detectedFormatName = res.getBarcodeFormat() ? BarcodeFormat[res.getBarcodeFormat()] : 'EAN-13';
              }
            } catch (e) {
              // Not found in mirrored crop
            }
          }

          // Try 90° rotated crop for vertical barcodes
          if (!detectedText && rotCtx) {
            try {
              const res = zxingReader.decode(rotCanvas as any);
              if (res && res.getText()) {
                detectedText = res.getText().trim();
                detectedFormatName = res.getBarcodeFormat() ? BarcodeFormat[res.getBarcodeFormat()] : 'EAN-13';
              }
            } catch (e) {
              // Not found in vertical crop
            }
          }

          // Try 90° rotated mirrored crop
          if (!detectedText && rotMirrorCtx) {
            try {
              const res = zxingReader.decode(rotMirrorCanvas as any);
              if (res && res.getText()) {
                detectedText = res.getText().trim();
                detectedFormatName = res.getBarcodeFormat() ? BarcodeFormat[res.getBarcodeFormat()] : 'EAN-13';
              }
            } catch (e) {
              // Not found in rotated mirrored crop
            }
          }
        }

        // Barcode successfully recognized!
        if (detectedText) {
          isHandled = true;
          handleSuccessfulBarcode(detectedText, detectedFormatName);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  // PATH 3: iPhone Native Camera Photo Capture Fallback with Dual Orientation
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setErrorMessage(null);

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsProcessingPhoto(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        try {
          const hints = new Map<DecodeHintType, any>();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.ITF
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const staticReader = new BrowserMultiFormatReader(hints);
          let result: any = null;

          // 1. Try standard orientation
          try {
            result = await staticReader.decodeFromImageElement(img);
          } catch (err) {
            // 2. Try rotated 90° (in case photo of tube/book was snapped in portrait)
            const rotImgCanvas = document.createElement('canvas');
            rotImgCanvas.width = img.height;
            rotImgCanvas.height = img.width;
            const rotCtx = rotImgCanvas.getContext('2d');
            if (rotCtx) {
              rotCtx.translate(img.height / 2, img.width / 2);
              rotCtx.rotate((90 * Math.PI) / 180);
              rotCtx.drawImage(img, -img.width / 2, -img.height / 2);
              try {
                result = staticReader.decode(rotImgCanvas as any);
              } catch (err2) {
                // Not found
              }
            }

            // 3. Try mirrored horizontally (in case photo was snapped with front camera)
            if (!result) {
              const mirrorImgCanvas = document.createElement('canvas');
              mirrorImgCanvas.width = img.width;
              mirrorImgCanvas.height = img.height;
              const mirrorCtx = mirrorImgCanvas.getContext('2d');
              if (mirrorCtx) {
                mirrorCtx.translate(img.width, 0);
                mirrorCtx.scale(-1, 1);
                mirrorCtx.drawImage(img, 0, 0);
                try {
                  result = staticReader.decode(mirrorImgCanvas as any);
                } catch (err3) {
                  // Not found
                }
              }
            }
          }

          if (result && result.getText()) {
            handleSuccessfulBarcode(
              result.getText().trim(),
              result.getBarcodeFormat() ? BarcodeFormat[result.getBarcodeFormat()] : 'EAN-13'
            );
            return;
          }
        } catch (err) {
          console.warn('[ZXing Image Decode] Barcode not identified in photo:', err);
        }

        setErrorMessage('Could not detect a barcode. Please ensure only the barcode bars and number are clearly visible.');
        setIsProcessingPhoto(false);
      };
      img.onerror = () => {
        setIsProcessingPhoto(false);
        setErrorMessage('Failed to read photo.');
      };
      img.src = dataUrl;
    };
    fileReader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[#123B70] text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20">
        
        {/* Hidden iOS Native Camera Shutter Input */}
        {/* Hidden iOS Native Camera Shutter Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture={facingMode === 'user' ? 'user' : 'environment'}
          onChange={handlePhotoCapture}
          className="hidden"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 bg-[#0D2D56]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-white">Scan Barcode</h3>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {facingMode === 'user' ? 'Front (Mirror)' : 'Rear Camera'}
                </span>
              </div>
              <p className="text-[10px] text-blue-200">
                {facingMode === 'user' ? 'Mirrored selfie preview • Hold barcode to front camera' : 'Point camera at product barcode'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-transform duration-200 ${
              facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'
            }`}
            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
          />

          {/* Aiming Reticle / Guideline Overlay */}
          {hasCameraPermission && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div
                className={`relative w-full max-w-[275px] h-38 rounded-2xl transition-all duration-200 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] flex items-center justify-center ${
                  successResult
                    ? 'border-3 border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_#10B981]'
                    : 'border-2 border-emerald-400/90'
                }`}
              >
                {/* Corner bracket reticles */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-300 rounded-tl pointer-events-none"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-300 rounded-tr pointer-events-none"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-300 rounded-bl pointer-events-none"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-300 rounded-br pointer-events-none"></div>

                {/* Laser scan lines (Horizontal & Vertical crosshair guides for vertical barcodes) */}
                {!successResult && (
                  <>
                    <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                    <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-0.5 bg-red-500/40 shadow-[0_0_6px_#ef4444] animate-pulse"></div>
                  </>
                )}

                {/* Instruction Badge */}
                {!successResult ? (
                  <div className="absolute -top-7 left-0 right-0 text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-black/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {facingMode === 'user' ? 'Front Camera (Mirror) • Align Barcode' : 'Align Barcode & Digits Inside'}
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded-2xl p-2 animate-in zoom-in-95 duration-150">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1 shadow-md shadow-emerald-500/40">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <div className="font-mono text-sm sm:text-base font-black text-emerald-300 tracking-wider bg-emerald-950/90 px-3 py-1 rounded-lg border border-emerald-400/50 shadow-inner">
                      {successResult.code}
                    </div>
                    <div className="text-[10px] text-emerald-200 font-bold uppercase mt-1">
                      {successResult.format} Read Successfully
                    </div>
                  </div>
                )}

                {/* Bottom Helper */}
                {!successResult && (
                  <div className="absolute -bottom-7 left-0 right-0 text-center">
                    <span className="text-[10px] font-medium text-white/90 bg-black/75 px-2.5 py-0.5 rounded-full">
                      Auto-detects horizontal & vertical barcodes
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading or Processing states */}
          {hasCameraPermission === null && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-2" />
              <p className="text-xs font-bold text-white">Starting phone camera...</p>
            </div>
          )}

          {isProcessingPhoto && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
              <p className="text-xs font-bold text-white">Analyzing Barcode from Photo...</p>
            </div>
          )}

          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-5 text-center">
              <AlertCircle className="w-9 h-9 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-white mb-3 max-w-xs">{errorMessage || 'Camera access error.'}</p>
              
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo with iOS Camera</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Try Camera Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Notification Banner if image detection failed */}
        {errorMessage && hasCameraPermission && (
          <div className="bg-amber-500/20 border-t border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Bottom Controls: Torch, Photo Shutter Fallback & Flip Camera */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0D2D56] border-t border-white/10 gap-2">
          {/* Torch button */}
          {hasTorch ? (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isTorchOn ? 'bg-amber-400 text-black shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
              <span>{isTorchOn ? 'Flash ON' : 'Flash'}</span>
            </button>
          ) : (
            <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Scanner
            </div>
          )}

          {/* Primary High-Resolution iOS Camera Shutter Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md transition-all cursor-pointer border border-emerald-400/40"
            title="Open native camera to snap a high-resolution photo of the barcode"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-200" />
            <span>Snap Photo</span>
          </button>

          {/* Flip Camera Facing */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer ${
              facingMode === 'user'
                ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Flip between front and rear camera"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${facingMode === 'user' ? 'rotate-180' : ''} transition-transform duration-300`} />
            <span>{facingMode === 'user' ? 'Front (Mirror)' : 'Flip'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
