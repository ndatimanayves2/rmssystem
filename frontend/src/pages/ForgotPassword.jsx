import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('If the email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send reset link. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="card p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Mail size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
            <p className="text-slate-500 mt-2">Enter your email address and we will send reset instructions.</p>
          </div>

          {status && <div className="alert alert-success">{status}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-group">
              <label className="label">Email address</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Mail size={16} /></span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="input pl-10" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-500 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
