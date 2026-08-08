import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import api from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!token) {
      setError('Reset token is missing.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setStatus('Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-slate-500 mt-2">Enter a new password to update your account.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {status && <div className="alert alert-success">{status}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-group">
              <label className="label">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength={8} />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input" required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
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
