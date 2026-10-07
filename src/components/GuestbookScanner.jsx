import { useEffect, useRef, useState } from 'react';

export default function GuestbookScanner({ onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  onScanRef.current = onScan;

  useEffect(() => () => controlsRef.current?.stop(), []);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  };

  const startScanner = async () => {
    setError('');
    handledRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Akses kamera memerlukan HTTPS atau localhost dan browser yang mendukung kamera.');
      return;
    }

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
        setIsScanning(false);
        onScanRef.current(result.getText());
      });
      controlsRef.current = controls;
      if (handledRef.current) {
        controls.stop();
        controlsRef.current = null;
      } else {
        setIsScanning(true);
      }
    } catch (scanError) {
      setIsScanning(false);
      setError(scanError.message || 'Kamera tidak dapat dimulai. Izinkan akses kamera lalu coba lagi.');
    }
  };

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
