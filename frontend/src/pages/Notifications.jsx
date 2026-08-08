import { useEffect, useState } from 'react';
import { Bell, CheckCircle, BellOff } from 'lucide-react';
import api from '../api';
import { PageHeader, EmptyState } from '../components/ui';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = () => {
    setLoading(true);
    api.get('/notifications')
      .then(r => setNotifications(r.data.data || []))
      .catch(err => setError(err.response?.data?.error || 'Unable to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(n => n.filter(item => item.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to mark notification read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to mark all notifications read');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-sm text-slate-500">Review system alerts, delivery updates, and emergency requests.</p>
        </div>
        <button className="btn btn-outline" onClick={markAllRead} disabled={notifications.length === 0}>
          <BellOff size={16} /> Mark all read
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid gap-4">
        {notifications.map(notification => (
          <div key={notification.id} className="card p-4 border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">{notification.title}</div>
                <div className="text-xs text-slate-500 mt-1">{notification.message}</div>
                <div className="text-[11px] text-slate-400 mt-2">{new Date(notification.created_at).toLocaleString()}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => markRead(notification.id)}>
                <CheckCircle size={14} /> Read
              </button>
            </div>
          </div>
        ))}

        {notifications.length === 0 && !loading && <EmptyState message="You have no new notifications." />}
      </div>
    </div>
  );
}
