import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Shield, Moon, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { PageHeader, Alert } from '../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/auth/profile')
      .then(r => setProfile(r.data.data || r.data))
      .catch(err => setError(err.response?.data?.error || 'Unable to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const toggle2FA = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (profile?.two_fa_enabled) {
        await api.post('/auth/disable-2fa');
        setProfile(prev => ({ ...prev, two_fa_enabled: false }));
        setMessage('Two-factor authentication disabled.');
      } else {
        await api.post('/auth/setup-2fa');
        setProfile(prev => ({ ...prev, two_fa_enabled: true }));
        setMessage('Two-factor authentication enabled.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="System Settings" />

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon size={20} className="text-blue-600" />
            <div>
              <h2 className="font-semibold text-slate-800">Account Settings</h2>
              <p className="text-sm text-slate-500">Update your security and personal preferences.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div><strong>Name:</strong> {profile?.name || user?.name}</div>
            <div><strong>Email:</strong> {profile?.email || user?.email}</div>
            <div><strong>Role:</strong> {profile?.role?.replace(/_/g, ' ') || user?.role?.replace(/_/g, ' ')}</div>
            <div><strong>Status:</strong> {profile?.is_active ? 'Active' : 'Inactive'}</div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-green-600" />
            <div>
              <h2 className="font-semibold text-slate-800">Security</h2>
              <p className="text-sm text-slate-500">Enable or disable two-factor authentication for your account.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Two-Factor Authentication</div>
              <div className="text-xs text-slate-500">Protect your login with OTP verification.</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={toggle2FA} disabled={loading}>
              {profile?.two_fa_enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Moon size={20} className="text-slate-500" />
            <div>
              <h2 className="font-semibold text-slate-800">Theme</h2>
              <p className="text-sm text-slate-500">Use the top bar toggle to switch between light and dark mode.</p>
            </div>
          </div>
          <div className="badge badge-gray">Managed in the top navigation</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck size={20} className="text-purple-600" />
            <div>
              <h2 className="font-semibold text-slate-800">User Profile</h2>
              <p className="text-sm text-slate-500">Your profile information is synced from the backend.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div><strong>Facility:</strong> {profile?.facility_name || '—'}</div>
            <div><strong>Phone:</strong> {profile?.phone || '—'}</div>
            <div><strong>2FA Status:</strong> {profile?.two_fa_enabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
