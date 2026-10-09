import { useCallback, useEffect, useRef, useState } from 'react';

export default function GuestbookScanner({ onScan, autoStart = false }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const requestIdRef = useRef(0);
  const isStartingRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  onScanRef.current = onScan;

  const stopScanner = useCallback(() => {
    requestIdRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    isStartingRef.current = false;
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || controlsRef.current) return;
    setError('');
    handledRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Akses kamera memerlukan HTTPS atau localhost dan browser yang mendukung kamera.');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    isStartingRef.current = true;
    setIsScanning(true);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      let controls;
      controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || handledRef.current) return;
        handledRef.current = true;
        controls?.stop();
        controlsRef.current = null;
        isStartingRef.current = false;
        setIsScanning(false);
        onScanRef.current(result.getText());
      });
      if (requestId !== requestIdRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      if (handledRef.current) {
        controls.stop();
        controlsRef.current = null;
        isStartingRef.current = false;
      } else {
        setIsScanning(true);
      }
    } catch (scanError) {
      if (requestId !== requestIdRef.current) return;
      isStartingRef.current = false;
      setIsScanning(false);
      setError(scanError.message || 'Kamera tidak dapat dimulai. Izinkan akses kamera lalu coba lagi.');
    }
  }, []);

  useEffect(() => {
    if (autoStart) void startScanner();
  }, [autoStart, startScanner]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    isStartingRef.current = false;
  }, []);

  return (
    <div className="guestbook-scanner">
      <div className="guestbook-scanner-actions">
        {isScanning
          ? <button type="button" className="secondary-btn" onClick={stopScanner}>Matikan kamera</button>
          : <button type="button" className="primary-btn" onClick={startScanner}>Scan barcode dengan kamera</button>}
        <span>Arahkan kamera ke QR tiket tamu. Kamera memerlukan izin browser.</span>
      </div>
      <video ref={videoRef} className={isScanning ? 'guestbook-scanner-video is-active' : 'guestbook-scanner-video'} muted playsInline />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
