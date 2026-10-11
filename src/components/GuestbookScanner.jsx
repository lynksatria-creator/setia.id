import { useCallback, useEffect, useRef, useState } from 'react';

export default function GuestbookScanner({ onScan, autoStart = false }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const requestIdRef = useRef(0);
  const isStartingRef = useRef(false);
  const selectedCameraIdRef = useRef('');
  const lastScannedValueRef = useRef('');
  const lastDecodedAtRef = useRef(0);
  const restartTimerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  onScanRef.current = onScan;

  const stopScanner = useCallback(() => {
    requestIdRef.current += 1;
    window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    isStartingRef.current = false;
    setIsScanning(false);
    setIsCameraReady(false);
  }, []);

  const startScanner = useCallback(async (cameraId = selectedCameraIdRef.current) => {
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
    setIsCameraReady(false);
    try {
      const [{ BrowserQRCodeReader }, { DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);
      const reader = new BrowserQRCodeReader(
        new Map([[DecodeHintType.TRY_HARDER, true]]),
        { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 250 },
      );
      let controls;
      const video = cameraId
        ? { deviceId: { exact: cameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } };
      controls = await reader.decodeFromConstraints({ audio: false, video }, videoRef.current, (result, decodeError) => {
        if (!result) {
          if (decodeError && Date.now() - lastDecodedAtRef.current > 1200) {
            lastScannedValueRef.current = '';
          }
          return;
        }
        const scannedValue = result.getText();
        if (handledRef.current) return;
        lastDecodedAtRef.current = Date.now();
        if (scannedValue === lastScannedValueRef.current) return;
        handledRef.current = true;
        lastScannedValueRef.current = scannedValue;
        controls?.stop();
        controlsRef.current = null;
        isStartingRef.current = false;
        setIsScanning(false);
        setIsProcessing(true);
        Promise.resolve(onScanRef.current(scannedValue))
          .catch((scanError) => setError(scanError.message || 'Tiket gagal diproses. Silakan coba lagi.'))
          .finally(() => {
            if (requestId !== requestIdRef.current) return;
            restartTimerRef.current = window.setTimeout(() => {
              restartTimerRef.current = null;
              setIsProcessing(false);
              void startScanner(cameraId);
            }, 800);
          });
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
        setIsCameraReady(true);
        setIsScanning(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (requestId !== requestIdRef.current) return;
        const videoInputs = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({ id: device.deviceId, label: device.label || `Kamera ${index + 1}` }));
        setCameras(videoInputs);
        if (!cameraId && videoInputs.length) {
          const activeDeviceId = videoRef.current?.srcObject?.getVideoTracks()[0]?.getSettings().deviceId;
          const activeCamera = videoInputs.find((camera) => camera.id === activeDeviceId);
          if (activeCamera) {
            selectedCameraIdRef.current = activeCamera.id;
            setSelectedCameraId(activeCamera.id);
          }
        }
      }
    } catch (scanError) {
      if (requestId !== requestIdRef.current) return;
      isStartingRef.current = false;
      setIsScanning(false);
      setIsCameraReady(false);
      setIsProcessing(false);
      const cameraErrors = {
        NotAllowedError: 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser lalu mulai pemindaian lagi.',
        NotFoundError: 'Kamera tidak ditemukan pada perangkat ini.',
        NotReadableError: 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.',
        OverconstrainedError: 'Kamera yang dipilih tidak tersedia. Pilih kamera lain lalu coba lagi.',
        SecurityError: 'Akses kamera diblokir. Buka halaman melalui HTTPS atau localhost.',
      };
      setError(cameraErrors[scanError.name] || `Kamera tidak dapat memulai pemindaian: ${scanError.message || 'coba pilih kamera lain.'}`);
    }
  }, []);

  const chooseCamera = (event) => {
    const cameraId = event.target.value;
    selectedCameraIdRef.current = cameraId;
    setSelectedCameraId(cameraId);
    stopScanner();
    void startScanner(cameraId);
  };

  useEffect(() => {
    if (!autoStart) return undefined;
    const startTimer = window.setTimeout(() => void startScanner(), 0);
    return () => window.clearTimeout(startTimer);
  }, [autoStart, startScanner]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    window.clearTimeout(restartTimerRef.current);
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    isStartingRef.current = false;
  }, []);

  return (
    <div className="guestbook-scanner">
      <div className="guestbook-scanner-actions">
        {isScanning
          ? <button type="button" className="secondary-btn" onClick={stopScanner}>Matikan kamera</button>
          : <button type="button" className="primary-btn" disabled={isProcessing} onClick={() => void startScanner()}>{isProcessing ? 'Memproses tiket…' : 'Scan barcode dengan kamera'}</button>}
        {cameras.length > 1 ? (
          <label className="guestbook-camera-select">
            Pilih kamera
            <select value={selectedCameraId} onChange={chooseCamera}>
              {cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.label}</option>)}
            </select>
          </label>
        ) : null}
        <span>Arahkan kamera ke QR tiket tamu, pastikan QR terlihat utuh dan cukup terang. Kamera memerlukan izin browser.</span>
      </div>
      <video ref={videoRef} className={isScanning ? 'guestbook-scanner-video is-active' : 'guestbook-scanner-video'} muted playsInline />
      {isProcessing ? <p className="guestbook-scanner-status" role="status">QR terbaca, sedang mencatat check-in…</p> : null}
      {isScanning ? (
        <p className="guestbook-scanner-status" role="status">
          {isCameraReady
            ? 'Kamera aktif. Posisikan QR di tengah gambar dan tahan perangkat sampai tiket terbaca.'
            : 'Meminta izin dan menyiapkan kamera…'}
        </p>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
