import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [roles] = useState([
    { id: 1, name: 'MOH_ADMIN' }, { id: 2, name: 'WAREHOUSE_MANAGER' },
    { id: 3, name: 'DISTRICT_HOSPITAL' }, { id: 4, name: 'HEALTH_CENTER' },
    { id: 5, name: 'SUPPLIER' }, { id: 6, name: 'DRIVER' }
  ]);
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role_id: '', facility_id: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/users').then(r => setUsers(r.data.data));

  useEffect(() => {
    load();
    api.get('/facilities').then(r => setFacilities(r.data.data));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      await api.post('/auth/register', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', password: '', role_id: '', facility_id: '' });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add User</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Facility</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ fontSize: 12 }}>{u.email}</td>
                <td><span className="badge badge-blue">{u.role}</span></td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.facility || '—'}</td>
                <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="empty-state">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add New User</span>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label><input value={form.name} onChange={set('name')} required /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={set('phone')} /></div>
                <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={set('password')} required minLength={8} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role_id} onChange={set('role_id')} required>
                    <option value="">Select role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Facility</label>
                  <select value={form.facility_id} onChange={set('facility_id')}>
                    <option value="">None</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
