import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Mail, Lock, ShieldCheck, ArrowRight, Key } from 'lucide-react';

export default function Login() {
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [twoFA, setTwoFA] = useState({ required: false, userId: null, token: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }));

  const handleLogin = async event => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res.requires2FA) {
        setTwoFA({ required: true, userId: res.userId, token: '' });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async event => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify2FA(twoFA.userId, twoFA.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid authentication code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="card p-8 shadow-xl">
<div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <Logo size={64} showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MedSupply Rwanda</h1>
            <p className="text-slate-500 mt-2">Secure access to the national medical supply chain ERP.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {!twoFA.required ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="form-group">
                <label className="label">Username / Email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Mail size={16} /></span>
                  <input type="email" value={form.email} onChange={setField('email')} required placeholder="admin@moh.gov.rw" className="input pl-10" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Lock size={16} /></span>
                  <input type="password" value={form.password} onChange={setField('password')} required placeholder="••••••••" className="input pl-10" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-500">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={remember} onChange={() => setRemember(prev => !prev)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot Password?</Link>
              </div>
              <button type="submit" className="btn btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handle2FA} className="space-y-5">
              <div className="text-slate-600 text-sm">
                Two-factor authentication is enabled on your account. Enter the 6-digit code from your app.
              </div>
              <div className="form-group">
                <label className="label">OTP Code</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Key size={16} /></span>
                  <input type="text" value={twoFA.token} onChange={e => setTwoFA(prev => ({ ...prev, token: e.target.value }))} maxLength={6} placeholder="000000" className="input pl-10" required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
