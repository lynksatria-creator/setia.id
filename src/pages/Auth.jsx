import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Auth({ onBack, onSuccess }) {
  const initialMode = new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationStep, setRegistrationStep] = useState('details');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isChecking, login, requestRegistrationCode, resendRegistrationCode, verifyRegistrationCode, logout } = useAuth();
  const passwordRequirements = [
    { label: 'Minimal 8 karakter', met: password.length >= 8, required: true },
    { label: 'Huruf kecil', met: /[a-z]/.test(password), required: true },
    { label: 'Huruf besar', met: /[A-Z]/.test(password), required: true },
    { label: 'Angka', met: /\d/.test(password), required: true },
    { label: 'Simbol', met: /[^A-Za-z0-9]/.test(password), required: false },
  ];
  const requiredPasswordValid = passwordRequirements.filter((item) => item.required).every((item) => item.met);
  const hasPasswordSymbol = passwordRequirements.find((item) => !item.required).met;
  const passwordStrengthLevel = !password ? 0 : !requiredPasswordValid ? 1 : hasPasswordSymbol ? 3 : 2;
  const passwordStrengthLabel = ['Belum diukur', 'Lemah', 'Cukup', 'Kuat'][passwordStrengthLevel];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (mode === 'register' && registrationStep === 'details' && !requiredPasswordValid) {
      setError('Kata sandi harus memiliki minimal 8 karakter, huruf kecil, huruf besar, dan angka.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'register' && registrationStep === 'details') {
        const result = await requestRegistrationCode({ full_name: fullName, email, password });
        setRegistrationStep('verification');
        setStatus(result.message);
      } else if (mode === 'register') {
        await verifyRegistrationCode({ email, code: verificationCode });
        onSuccess();
      } else {
        await login({ email, password });
        onSuccess();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setStatus('');
    setIsSubmitting(true);
    try {
      const result = await resendRegistrationCode(email);
      setStatus(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <button className="auth-back-link" onClick={onBack}>← Kembali ke Nuansa Invite</button>
      <section className="auth-page-panel">
        <div className="auth-page-art">
          <span>NUANSA INVITE</span>
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
              <p className="eyebrow">{mode === 'register' ? registrationStep === 'verification' ? 'Verifikasi email' : 'Mulai perjalanan Anda' : 'Selamat datang kembali'}</p>
              <h1>{mode === 'register' ? registrationStep === 'verification' ? 'Masukkan kode OTP' : 'Buat akun' : 'Masuk ke akun'}</h1>
              <p className="auth-intro">
                {mode === 'register' && registrationStep === 'verification'
                  ? `Kami mengirim kode 6 digit ke ${email}. Kode berlaku selama 10 menit.`
                  : 'Simpan pilihan desain dan kelola undangan Anda dari satu tempat.'}
              </p>
              <form onSubmit={handleSubmit}>
                {mode === 'register' && registrationStep === 'details' ? (
                  <>
                    <label>Nama lengkap<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></label>
                    <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                    <label>Kata sandi<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} aria-describedby="registration-password-help registration-password-strength" /></label>
                    <div className={`auth-password-strength auth-password-strength-${passwordStrengthLevel}`} id="registration-password-strength" role="meter" aria-label="Kekuatan kata sandi" aria-valuemin={0} aria-valuemax={3} aria-valuenow={passwordStrengthLevel} aria-valuetext={passwordStrengthLabel}>
                      <div className="auth-password-strength-track" aria-hidden="true">
                        {[1, 2, 3].map((level) => <span key={level} className={passwordStrengthLevel >= level ? 'is-active' : ''} />)}
                      </div>
                      <strong>{passwordStrengthLabel}</strong>
                    </div>
                    <ul className="auth-password-requirements" id="registration-password-help" aria-label="Persyaratan kata sandi">
                      {passwordRequirements.map((item) => (
                        <li key={item.label} className={`${item.met ? 'is-met' : ''}${item.required ? '' : ' is-optional'}`}>
                          <span aria-hidden="true">{item.met ? '✓' : '○'}</span>
                          {item.label}{item.required ? '' : ' (opsional)'}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : mode === 'register' ? (
                  <label>
                    Kode OTP
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      aria-describedby="registration-code-hint"
                    />
                    <small id="registration-code-hint">Masukkan kode 6 digit yang dikirim ke {email}.</small>
                  </label>
                ) : (
                  <>
                    <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                    <label>Kata sandi<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
                  </>
                )}
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                {status ? <p className="auth-status" role="status">{status}</p> : null}
                <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Memproses…' : mode === 'register' ? registrationStep === 'verification' ? 'Verifikasi email' : 'Daftar' : 'Masuk'}</button>
              </form>
              {mode === 'register' && registrationStep === 'verification' ? (
                <div className="auth-registration-actions">
                  <button className="auth-text-button" type="button" onClick={handleResendCode} disabled={isSubmitting}>Kirim ulang kode</button>
                  <button className="auth-text-button" type="button" onClick={() => { setError(''); setStatus(''); setVerificationCode(''); setRegistrationStep('details'); }}>Ubah data pendaftaran</button>
                </div>
              ) : (
                <p className="auth-switch">{mode === 'register' ? 'Sudah punya akun?' : 'Belum punya akun?'} <button className="auth-text-button" onClick={() => { setError(''); setStatus(''); setRegistrationStep('details'); setMode(mode === 'register' ? 'login' : 'register'); }}>{mode === 'register' ? 'Masuk' : 'Daftar sekarang'}</button></p>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
