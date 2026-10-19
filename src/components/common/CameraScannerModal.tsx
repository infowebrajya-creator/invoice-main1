import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Zap, ZapOff } from 'lucide-react';

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
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState<boolean>(true);

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

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Camera access is not supported by your browser. Please use manual search or a Bluetooth/USB scanner.');
      setHasCameraPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
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
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings to scan barcodes.');
      } else {
        setErrorMessage('Could not start camera video stream. ' + (err.message || ''));
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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
    if (!('BarcodeDetector' in window)) {
      setIsBarcodeDetectorSupported(false);
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
      });

      let isThrottled = false;

      const detectFrame = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        if (!isThrottled) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                isThrottled = true;
                playBeep();
                onScan(rawValue.trim());
                onClose();
                return;
              }
            }
          } catch (e) {
            // Frame detection error, continue next frame
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      };

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } catch (e) {
      setIsBarcodeDetectorSupported(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[#123B70] text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 bg-[#0D2D56]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Scan Barcode</h3>
              <p className="text-[10px] text-blue-200">Point phone camera at product barcode</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
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
            className="w-full h-full object-cover"
          />

          {/* Aiming Reticle / Guideline Overlay */}
          {hasCameraPermission && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-full max-w-[260px] h-36 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Red Laser Sweep Line */}
                <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                <div className="absolute -top-7 left-0 right-0 text-center text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full mx-auto w-fit">
                  Align Barcode Inside Box
                </div>
              </div>
            </div>
          )}

          {/* Loading or Error states */}
          {hasCameraPermission === null && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-2" />
              <p className="text-xs font-bold text-white">Starting phone camera...</p>
            </div>
          )}

          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-white mb-2">{errorMessage || 'Camera access error.'}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Warning if BarcodeDetector is not natively supported */}
        {!isBarcodeDetectorSupported && hasCameraPermission && (
          <div className="bg-amber-500/20 border-t border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 text-center font-medium">
            Note: On some older browsers, native barcode detection requires Chrome or iOS 17+. You can also type or use USB scanner.
          </div>
        )}

        {/* Bottom Controls: Torch & Camera Switch */}
        <div className="flex items-center justify-around px-4 py-3 bg-[#0D2D56] border-t border-white/10">
          {hasTorch ? (
            <button
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isTorchOn ? 'bg-amber-400 text-black shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
              <span>{isTorchOn ? 'Flash ON' : 'Flash'}</span>
            </button>
          ) : (
            <div className="text-[11px] text-blue-200/60 font-mono">Camera Ready</div>
          )}

          <button
            onClick={toggleCameraFacing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Flip Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
};
