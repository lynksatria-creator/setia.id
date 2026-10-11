import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import GuestbookScanner from './GuestbookScanner';

const scannerMocks = vi.hoisted(() => ({
  decodeFromConstraints: vi.fn(),
  onDecode: null,
  controls: { stop: vi.fn() },
}));

vi.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: class {
    decodeFromConstraints(...args) {
      return scannerMocks.decodeFromConstraints(...args);
    }
  },
}));

const setMediaDevices = (mediaDevices) => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
};

beforeEach(() => {
  scannerMocks.decodeFromConstraints.mockReset();
  scannerMocks.controls.stop.mockReset();
  scannerMocks.decodeFromConstraints.mockImplementation(async (_constraints, _video, callback) => {
    scannerMocks.onDecode = callback;
    return scannerMocks.controls;
  });
  setMediaDevices({
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'rear-camera', kind: 'videoinput', label: 'Back camera' },
      { deviceId: 'front-camera', kind: 'videoinput', label: 'Front camera' },
    ]),
  });
});

test('starts the rear-facing camera with higher resolution and forwards a decoded QR', async () => {
  const onScan = vi.fn();
  render(<GuestbookScanner onScan={onScan} />);

  fireEvent.click(screen.getByRole('button', { name: 'Scan barcode dengan kamera' }));

  await waitFor(() => expect(scannerMocks.decodeFromConstraints).toHaveBeenCalled());
  expect(scannerMocks.decodeFromConstraints).toHaveBeenCalledWith(
    {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    expect.any(HTMLVideoElement),
    expect.any(Function),
  );
  expect(await screen.findByText(/kamera aktif/i)).toBeDefined();
  fireEvent.change(screen.getByLabelText('Pilih kamera'), { target: { value: 'front-camera' } });
  await waitFor(() => expect(scannerMocks.decodeFromConstraints).toHaveBeenCalledTimes(2));
  expect(scannerMocks.decodeFromConstraints.mock.calls[1][0].video.deviceId).toEqual({ exact: 'front-camera' });

  scannerMocks.onDecode({ getText: () => 'https://example.com/undangan-ticket/token' });
  await waitFor(() => expect(onScan).toHaveBeenCalledWith('https://example.com/undangan-ticket/token'));
  expect(scannerMocks.controls.stop).toHaveBeenCalled();
});

test('resumes scanning after processing and ignores the same QR until it leaves the camera view', async () => {
  const onScan = vi.fn().mockResolvedValue(undefined);
  render(<GuestbookScanner onScan={onScan} autoStart />);

  await waitFor(() => expect(scannerMocks.decodeFromConstraints).toHaveBeenCalledTimes(1));
  const firstDecode = scannerMocks.onDecode;
  firstDecode({ getText: () => 'https://example.com/undangan-ticket/repeat-token' });
  expect(await screen.findByText(/sedang mencatat check-in/i)).toBeDefined();

  await waitFor(() => expect(scannerMocks.decodeFromConstraints).toHaveBeenCalledTimes(2));
  const secondDecode = scannerMocks.onDecode;
  secondDecode({ getText: () => 'https://example.com/undangan-ticket/repeat-token' });
  expect(onScan).toHaveBeenCalledTimes(1);

  await new Promise((resolve) => window.setTimeout(resolve, 1250));
  secondDecode(undefined, new Error('QR is no longer visible'));
  secondDecode({ getText: () => 'https://example.com/undangan-ticket/repeat-token' });
  expect(onScan).toHaveBeenCalledTimes(2);
});

test('shows a clear camera-permission error', async () => {
  scannerMocks.decodeFromConstraints.mockRejectedValueOnce(Object.assign(new Error('Permission denied'), {
    name: 'NotAllowedError',
  }));
  render(<GuestbookScanner onScan={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Scan barcode dengan kamera' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/izin kamera ditolak/i);
});

test('does not request the camera twice when auto-starting under React strict mode', async () => {
  render(<StrictMode><GuestbookScanner onScan={vi.fn()} autoStart /></StrictMode>);

  await waitFor(() => expect(scannerMocks.decodeFromConstraints).toHaveBeenCalledTimes(1));
  expect(await screen.findByText(/kamera aktif/i)).toBeDefined();
});
