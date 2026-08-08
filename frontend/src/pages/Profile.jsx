import { useState } from 'react';
import { Key, Shield, Camera } from 'lucide-react';
import { PageHeader, Alert, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('info');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setMsg({ type: 'error', text: 'New passwords do not match' }); return;
    }
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" />

      <Tabs
        tabs={[
          { key: 'info',     label: 'Profile Info' },
          { key: 'password', label: 'Change Password' },
          { key: 'security', label: 'Security' },
        ]}
        active={tab} onChange={setTab}
      />

      {tab === 'info' && (
        <div className="card p-6">
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50">
                <Camera size={12} className="text-slate-500" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{user?.name}</h2>
              <p className="text-slate-500 text-sm">{user?.email}</p>
              <span className="badge badge-blue mt-1">{user?.role?.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name',  value: user?.name },
              { label: 'Email',      value: user?.email },
              { label: 'Phone',      value: user?.phone || '—' },
              { label: 'Role',       value: user?.role?.replace(/_/g, ' ') },
              { label: 'Facility',   value: user?.facility_id || '—' },
              { label: 'Status',     value: user?.is_active ? 'Active' : 'Inactive' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className="text-sm font-medium text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Key size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Change Password</h3>
              <p className="text-xs text-slate-500">Use a strong password with at least 8 characters</p>
            </div>
          </div>

          {msg.text && <Alert type={msg.type}>{msg.text}</Alert>}

          <form onSubmit={handlePwChange} className="space-y-4">
            <div className="form-group">
              <label className="label">Current Password</label>
              <input type="password" className="input" value={pwForm.current_password}
                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">New Password</label>
              <input type="password" className="input" value={pwForm.new_password}
                onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner-sm" /> : <Key size={15} />}
              Update Password
            </button>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Security Settings</h3>
              <p className="text-xs text-slate-500">Manage two-factor authentication and security</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="font-medium text-sm text-slate-800">Two-Factor Authentication</div>
                <div className="text-xs text-slate-500 mt-0.5">Add an extra layer of security to your account</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${user?.two_fa_enabled ? 'badge-green' : 'badge-gray'}`}>
                  {user?.two_fa_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button className="btn btn-outline btn-sm"
                  onClick={() => api.post(user?.two_fa_enabled ? '/auth/disable-2fa' : '/auth/setup-2fa')}>
                  {user?.two_fa_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="font-medium text-sm text-slate-800">Account Status</div>
                <div className="text-xs text-slate-500 mt-0.5">Your account is currently active</div>
              </div>
              <span className="badge badge-green">Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
