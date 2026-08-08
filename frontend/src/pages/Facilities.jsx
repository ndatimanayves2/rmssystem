import { useEffect, useState } from 'react';
import { Building2, Search, MapPin, ShieldCheck } from 'lucide-react';
import api from '../api';
import { PageHeader, EmptyState } from '../components/ui';

const TYPE_LABELS = {
  HEALTH_CENTER: 'Health Center',
  DISTRICT_HOSPITAL: 'District Hospital',
  CENTRAL_WAREHOUSE: 'Warehouse',
  SUPPLIER: 'Supplier',
};

export default function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/facilities')
      .then(r => setFacilities(r.data.data || []))
      .catch(err => setError(err.response?.data?.error || 'Unable to load facilities'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = facilities.filter(f => {
    const matchesSearch = [f.name, f.district_name, f.province_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType = filter === 'ALL' || f.type === filter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Facilities</h1>
          <p className="text-sm text-slate-500">Track all registered health facilities and monitor inventory coverage.</p>
        </div>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total facilities</div>
          <div className="text-3xl font-semibold mt-3">{facilities.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Hospitals</div>
          <div className="text-3xl font-semibold mt-3">{facilities.filter(f => f.type === 'DISTRICT_HOSPITAL').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Health centers</div>
          <div className="text-3xl font-semibold mt-3">{facilities.filter(f => f.type === 'HEALTH_CENTER').length}</div>
        </div>
      </div>

      <div className="card p-4 mb-6 grid gap-3 md:grid-cols-3">
        <div className="relative w-full md:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search facilities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="ALL">All Facility Types</option>
          <option value="HEALTH_CENTER">Health Centers</option>
          <option value="DISTRICT_HOSPITAL">District Hospitals</option>
          <option value="CENTRAL_WAREHOUSE">Warehouses</option>
          <option value="SUPPLIER">Suppliers</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Type</th>
                <th>Region</th>
                <th>Contacts</th>
                <th>Inventory Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div className="text-slate-500 text-xs">{f.district_name}, {f.province_name}</div>
                  </td>
                  <td><span className="badge badge-blue">{TYPE_LABELS[f.type] || f.type}</span></td>
                  <td>{f.district_name || '—'}</td>
                  <td>{f.contact_phone || '—'}</td>
                  <td><span className="badge badge-gray">{f.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">No facilities found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!error && loading && <EmptyState message="Loading facilities..." />}
    </div>
  );
}
