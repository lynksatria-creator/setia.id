import { useEffect, useState } from 'react';
import { nunuyConsultationsApi } from '../lib/api';

const consultationStatusLabels = {
  new: 'Baru',
  contacted: 'Sudah dihubungi',
  closed: 'Selesai',
};

export default function NunuyConsultationAdmin({ token }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    nunuyConsultationsApi.listAdmin(token)
      .then((consultations) => {
        if (active) setItems(consultations);
      })
      .catch((failure) => {
        if (active) setError(`Data konsultasi gagal dimuat: ${failure.message}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const updateStatus = async (item, status) => {
    setError('');
    setMessage('');
    try {
      await nunuyConsultationsApi.updateStatus(token, item.id, status);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
      setMessage(`Status konsultasi ${item.couple} diperbarui: ${consultationStatusLabels[status]}.`);
    } catch (failure) {
      setError(`Status konsultasi gagal diperbarui: ${failure.message}`);
    }
  };

  return (
    <section className="admin-panel-block nunuy-consultation-admin">
      <h3>Manajemen konsultasi Nunuy</h3>
      <p className="muted">Permintaan dari formulir website tersimpan di API dan hanya dapat dilihat admin yang sudah login.</p>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {loading ? <p>Memuat permintaan konsultasi…</p> : null}
      {!loading && items.length === 0 ? <p>Belum ada permintaan konsultasi.</p> : null}
      <div className="nunuy-consultation-admin-list">
        {items.map((item) => (
          <article key={item.id}>
            <header>
              <div><strong>{item.couple}</strong><small>{consultationStatusLabels[item.status] || item.status}</small></div>
              <time dateTime={item.created_at}>{item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : ''}</time>
            </header>
            <div className="nunuy-consultation-admin-details">
              <a href={`tel:${String(item.phone || '').replace(/[^\d+]/g, '')}`}>{item.phone}</a>
              {item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null}
              {item.wedding_date ? <span>Tanggal: {item.wedding_date}</span> : null}
              {item.location ? <span>Lokasi: {item.location}</span> : null}
              {item.guests ? <span>Tamu: {item.guests}</span> : null}
              {item.service ? <span>Layanan: {item.service}</span> : null}
              {item.package ? <span>Paket: {item.package}</span> : null}
              {item.budget ? <span>Anggaran: {item.budget}</span> : null}
              {item.notes ? <p>Catatan: {item.notes}</p> : null}
            </div>
            <div className="nunuy-consultation-admin-actions">
              {item.status === 'new' ? <button type="button" onClick={() => updateStatus(item, 'contacted')}>Tandai sudah dihubungi</button> : null}
              {item.status !== 'closed' ? <button type="button" onClick={() => updateStatus(item, 'closed')}>Tandai selesai</button> : <button type="button" onClick={() => updateStatus(item, 'new')}>Buka kembali</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
