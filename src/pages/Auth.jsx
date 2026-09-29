import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Auth({ onBack, onSuccess }) {
  const initialMode = new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isChecking, login, register, logout } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'register') await register({ full_name: fullName, email, password });
      else await login({ email, password });
      onSuccess();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <button className="auth-back-link" onClick={onBack}>← Kembali ke Undangan.id</button>
      <section className="auth-page-panel">
        <div className="auth-page-art">
          <span>UNDANGAN.ID</span>
          <p>Rancang momen.<br />Bagikan ceritanya.</p>
        </div>
        <div className="auth-page-form-wrap">
          {isChecking ? <p>Memeriksa sesi…</p> : user ? (
            <div className="auth-signed-in">
              <p className="eyebrow">Akun Anda</p>
              <h1>Selamat datang, {user.full_name}</h1>
              <p>{user.email}</p>
              <button className="primary-btn" onClick={onSuccess}>Lanjutkan</button>
              <button className="auth-text-button" onClick={logout}>Keluar</button>
            </div>
          ) : (
            <>
              <p className="eyebrow">{mode === 'register' ? 'Mulai perjalanan Anda' : 'Selamat datang kembali'}</p>
              <h1>{mode === 'register' ? 'Buat akun' : 'Masuk ke akun'}</h1>
              <p className="auth-intro">Simpan pilihan desain dan kelola undangan Anda dari satu tempat.</p>
              <form onSubmit={handleSubmit}>
                {mode === 'register' ? (
                  <label>Nama lengkap<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></label>
                ) : null}
                <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label>Kata sandi<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Memproses…' : mode === 'register' ? 'Daftar' : 'Masuk'}</button>
              </form>
              <p className="auth-switch">{mode === 'register' ? 'Sudah punya akun?' : 'Belum punya akun?'} <button className="auth-text-button" onClick={() => { setError(''); setMode(mode === 'register' ? 'login' : 'register'); }}>{mode === 'register' ? 'Masuk' : 'Daftar sekarang'}</button></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
