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

  const startDetection = () => {
    let isHandled = false;

    // PATH 1: Android Chrome native hardware BarcodeDetector (Fast Path)
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf']
        });

        setActiveEngine('native');

        const detectFrame = async () => {
          if (isHandled) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(detectFrame);
            return;
          }

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                isHandled = true;
                playBeep();
                onScan(rawValue.trim());
                onClose();
                return;
              }
            }
          } catch (e) {
            // Frame detection error, continue next frame
          }

          animationFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      } catch (nativeErr) {
        console.warn('Native BarcodeDetector init failed, engaging ZXing:', nativeErr);
      }
    }

    // PATH 2: Universal ZXing Multi-Format Reader (Guaranteed for iPhone/iOS Safari)
    try {
      setActiveEngine('zxing');

      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.ITF
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, 250); // 250ms interval between frames
      zxingReaderRef.current = codeReader;

      if (videoRef.current) {
        codeReader.decodeFromVideoElementContinuously(videoRef.current, (result, error) => {
          if (isHandled) return;
          if (result) {
            const scannedText = result.getText();
            if (scannedText) {
              isHandled = true;
              codeReader.reset();
              playBeep();
              onScan(scannedText.trim());
              onClose();
            }
          }
        });
      }
    } catch (zxingErr) {
      console.error('Universal ZXing decoder initialization error:', zxingErr);
    }
  };

  // PATH 3: iPhone Native Camera Photo Capture Fallback (<input capture="environment">)
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
            BarcodeFormat.QR_CODE,
            BarcodeFormat.ITF
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const staticReader = new BrowserMultiFormatReader(hints);
          const result = await staticReader.decodeFromImageElement(img);

          if (result && result.getText()) {
            playBeep();
            onScan(result.getText().trim());
            onClose();
            return;
          }
        } catch (err) {
          console.warn('[ZXing Image Decode] Barcode not identified in photo:', err);
        }

        setErrorMessage('Could not detect a barcode in that photo. Please align clearly and try again.');
        setIsProcessingPhoto(false);
      };
      img.onerror = () => {
        setIsProcessingPhoto(false);
        setErrorMessage('Failed to read photo.');
      };
      img.src = dataUrl;
    };
    fileReader.readAsDataURL(file);

    // Reset input so user can re-snap if needed
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[#123B70] text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20">
        
        {/* Hidden iOS Native Camera Shutter Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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
                  {activeEngine === 'native' ? 'Android / Native' : 'iOS / Universal ZXing'}
                </span>
              </div>
              <p className="text-[10px] text-blue-200">Point phone camera at product barcode</p>
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
            className="w-full h-full object-cover"
          />

          {/* Aiming Reticle / Guideline Overlay */}
          {hasCameraPermission && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-full max-w-[260px] h-36 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Red Laser Sweep Line */}
                <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                <div className="absolute -top-7 left-0 right-0 text-center text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full mx-auto w-fit">
                  Align Barcode Inside Box
                </div>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            title="Flip between front and rear camera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
