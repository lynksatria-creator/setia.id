import React, { useEffect, useState } from 'react';

export function PaymentReturnBanner({ onCheckStatus }) {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const txStatus = params.get('transaction_status');

    if (orderId && txStatus) {
      setNotice({ orderId, status: txStatus });
      if (['settlement', 'capture', 'success'].includes(txStatus)) {
        onCheckStatus?.(orderId);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!notice) return null;

  const isSuccess = ['settlement', 'capture', 'success'].includes(notice.status);

  return (
    <div className={`payment-notice-banner ${isSuccess ? 'is-success' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isSuccess ? (
          <span aria-hidden="true" style={{ color: '#1E6F42', flexShrink: 0, fontSize: '1.1rem' }}>✓</span>
        ) : (
          <span aria-hidden="true" style={{ color: '#B88E44', flexShrink: 0, fontSize: '1.1rem' }}>◷</span>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
            {isSuccess
              ? 'Pembayaran Berhasil Dikonfirmasi'
              : 'Menunggu Penyelesaian Pembayaran'}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
            ID Pesanan: <code style={{ fontWeight: 700 }}>{notice.orderId}</code> •{' '}
            {isSuccess
              ? 'Undangan Anda sudah aktif dan siap dibagikan.'
              : 'Selesaikan transaksi Anda agar status undangan otomatis aktif.'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isSuccess && (
          <button
            type="button"
            className="primary-button"
            style={{ padding: '7px 14px', fontSize: '0.78rem' }}
            onClick={() => onCheckStatus?.(notice.orderId)}
          >
            <span aria-hidden="true">↻</span>
            <span>Cek Status</span>
          </button>
        )}
        <button
          type="button"
          className="secondary-button"
          style={{ padding: '6px 8px' }}
          onClick={() => setNotice(null)}
          aria-label="Tutup notifikasi"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
