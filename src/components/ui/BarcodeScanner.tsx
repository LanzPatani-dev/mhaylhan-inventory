'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<import('@zxing/browser').BrowserMultiFormatReader | null>(null);
  const [status, setStatus] = useState<'requesting' | 'scanning' | 'error'>('requesting');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [flashOn, setFlashOn] = useState(false);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        const reader = scannerRef.current as any;
        if (typeof reader.reset === 'function') {
          reader.reset();
        }
      } catch (_) {}
      scannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('requesting');
    setErrorMsg('');

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // @ts-ignore - advanced constraints for auto-focus
          advanced: [{ focusMode: 'continuous' }],
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const reader = new BrowserMultiFormatReader();
      scannerRef.current = reader;

      if (!mountedRef.current) { stopScanner(); return; }
      setStatus('scanning');

      // Decode continuously from the video stream
      const decodeLoop = async () => {
        if (!mountedRef.current || !videoRef.current || !scannerRef.current) return;
        try {
          const result = await reader.decodeOnceFromVideoElement(videoRef.current);
          if (result && mountedRef.current) {
            const text = result.getText();
            if (text && text !== lastScanned) {
              setLastScanned(text);
              // Brief visual feedback then callback
              setTimeout(() => {
                if (mountedRef.current) {
                  stopScanner();
                  onScan(text);
                }
              }, 300);
            }
          }
        } catch {
          // No barcode found in this frame — retry. Other stream-related errors are ignored to keep scanning alive.
          if (mountedRef.current) setTimeout(decodeLoop, 200);
        }
      };

      decodeLoop();
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('devicenotfound')) {
        setErrorMsg('No camera found on this device.');
      } else {
        setErrorMsg(`Camera error: ${msg}`);
      }
      setStatus('error');
    }
  }, [onScan, stopScanner, lastScanned]);

  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      // @ts-ignore - torch is not in standard TS types yet
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn((f) => !f);
    } catch (_) {
      // torch not supported on this device
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9V5a2 2 0 0 1 2-2h4" /><path d="M15 3h4a2 2 0 0 1 2 2v4" />
                <path d="M21 15v4a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2v-4" />
                <rect x="9" y="9" width="6" height="6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-700 text-foreground">Barcode Scanner</p>
              <p className="text-xs text-muted-foreground">Point camera at barcode</p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close scanner"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-56 h-40">
                {/* Top-left */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-primary rounded-tl-lg" style={{ borderWidth: '3px' }} />
                {/* Top-right */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-primary rounded-tr-lg" style={{ borderWidth: '3px', borderLeft: 'none', borderBottom: 'none' }} />
                {/* Bottom-left */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-primary rounded-bl-lg" style={{ borderWidth: '3px', borderRight: 'none', borderTop: 'none' }} />
                {/* Bottom-right */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-primary rounded-br-lg" style={{ borderWidth: '3px', borderLeft: 'none', borderTop: 'none' }} />
                {/* Scanning line */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70 animate-scan-line" />
              </div>
              {/* Dark overlay outside the scan area */}
              <div className="absolute inset-0 -z-10" style={{
                background: 'radial-gradient(ellipse 220px 160px at center, transparent 50%, rgba(0,0,0,0.55) 100%)'
              }} />
            </div>
          )}

          {/* Requesting permission state */}
          {status === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm font-500">Requesting camera access…</p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
              <div className="p-3 bg-danger/20 rounded-full">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-white text-sm font-500">{errorMsg}</p>
              <button
                onClick={startScanner}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-5 py-4 bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {status === 'scanning' && (
              <span className="flex items-center gap-1.5 text-xs text-success font-600">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Scanning…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFlash}
              title="Toggle flashlight"
              className={`p-2 rounded-lg border transition-colors text-sm ${flashOn ? 'bg-warning/10 border-warning/30 text-warning' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </button>
            <button
              onClick={() => { stopScanner(); onClose(); }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors font-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
