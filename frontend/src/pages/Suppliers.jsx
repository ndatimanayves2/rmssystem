import { useEffect, useState } from 'react';
import { Factory, Search, Users } from 'lucide-react';
import api from '../api';
import { PageHeader, EmptyState } from '../components/ui';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/facilities', { params: { type: 'SUPPLIER' } })
      .then(r => setSuppliers(r.data.data || []))
      .catch(err => setError(err.response?.data?.error || 'Unable to load suppliers'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-sm text-slate-500">Manage supplier partners, contact details, and performance alerts.</p>
        </div>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total suppliers</div>
          <div className="text-3xl font-semibold mt-3">{suppliers.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Active suppliers</div>
          <div className="text-3xl font-semibold mt-3">{suppliers.filter(s => s.is_active !== false).length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Pending performance reviews</div>
          <div className="text-3xl font-semibold mt-3">{suppliers.filter(s => !s.performance_score).length}</div>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <Factory size={16} /> Add Supplier
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="text-slate-500 text-xs">{s.description || 'Trusted supplier'}</div>
                  </td>
                  <td>
                    <div>{s.contact_phone || '—'}</div>
                    <div className="text-slate-500 text-xs">{s.contact_email || '—'}</div>
                  </td>
                  <td>{s.district_name || s.province_name || '—'}</td>
                  <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><span className="badge badge-blue">{s.performance_score ?? 'N/A'}</span></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">No suppliers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!error && loading && <EmptyState message="Loading suppliers..." />}
    </div>
  );
}
