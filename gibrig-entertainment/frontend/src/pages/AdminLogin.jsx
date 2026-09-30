import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('gibrig_admin_token');
    if (token) navigate('/admin');
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Frontend-only mock auth. Will be replaced by backend later.
    await new Promise((r) => setTimeout(r, 600));
    if (creds.username === 'admin' && creds.password === 'admin123') {
      localStorage.setItem('gibrig_admin_token', 'mock-token-' + Date.now());
      toast.success('Login berhasil');
      navigate('/admin');
    } else {
      toast.error('Username atau password salah');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-royal-dark flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 grain" />
      <div className="orb bg-purple-500/40 w-[420px] h-[420px] -top-32 -left-24" />
      <div className="orb bg-amber-300/30 w-[360px] h-[360px] bottom-0 -right-24" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300/60 shadow-[0_20px_50px_-15px_rgba(212,175,55,0.7)]">
            <Crown size={28} className="text-purple-950" />
          </div>
          <h1 className="mt-5 font-display text-3xl text-white">
            Admin <span className="font-italic-accent text-amber-300">Panel</span>
          </h1>
          <p className="text-purple-200/80 text-sm mt-2">Official Gibrig Entertainment</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white/95 backdrop-blur rounded-2xl p-7 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)] border border-amber-300/30">
          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">Username</div>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-purple-200 bg-white text-purple-950 text-sm input-royal"
                value={creds.username}
                onChange={(e) => setCreds((p) => ({ ...p, username: e.target.value }))}
                placeholder="admin"
              />
            </div>
          </label>
          <label className="block mt-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">Password</div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type="password"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-purple-200 bg-white text-purple-950 text-sm input-royal"
                value={creds.password}
                onChange={(e) => setCreds((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          </label>

          <button disabled={loading} type="submit" className="btn-primary mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm disabled:opacity-60">
            {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
          </button>

          <div className="mt-5 text-center text-xs text-purple-700/70">
            Demo: <code className="bg-purple-50 px-1.5 py-0.5 rounded">admin</code> / <code className="bg-purple-50 px-1.5 py-0.5 rounded">admin123</code>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
