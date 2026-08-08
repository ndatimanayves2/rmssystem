import { useEffect, useState } from 'react';
import { Warehouse, MapPin, Truck } from 'lucide-react';
import api from '../api';
import { PageHeader, EmptyState } from '../components/ui';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/facilities', { params: { type: 'CENTRAL_WAREHOUSE' } })
      .then(r => setWarehouses(r.data.data || []))
      .catch(err => setError(err.response?.data?.error || 'Unable to load warehouses'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = warehouses.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.district_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="text-sm text-slate-500">Review warehouse capacity, stock thresholds, and distribution centers.</p>
        </div>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total warehouses</div>
          <div className="text-3xl font-semibold mt-3">{warehouses.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Warehouses with low stock</div>
          <div className="text-3xl font-semibold mt-3">{warehouses.filter(w => w.low_stock_count > 0).length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Dispatch ready</div>
          <div className="text-3xl font-semibold mt-3">{warehouses.filter(w => w.is_active !== false).length}</div>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search warehouses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <Truck size={16} /> Add Warehouse
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Low stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <div className="text-slate-500 text-xs">{w.description || 'Central warehouse'}</div>
                  </td>
                  <td>{w.district_name || '—'}</td>
                  <td>{w.manager_name || 'Unassigned'}</td>
                  <td><span className={`badge ${w.is_active !== false ? 'badge-green' : 'badge-red'}`}>{w.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                  <td><span className={`badge ${w.low_stock_count > 0 ? 'badge-red' : 'badge-green'}`}>{w.low_stock_count ?? 0}</span></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">No warehouses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!error && loading && <EmptyState message="Loading warehouses..." />}
    </div>
  );
}
