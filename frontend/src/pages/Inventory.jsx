import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../api';

const STATUS_BADGE = { ADEQUATE: 'badge-green', LOW: 'badge-yellow', CRITICAL: 'badge-red', OUT_OF_STOCK: 'badge-red' };

export default function Inventory() {
  const [tab, setTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [search, setSearch] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    api.get('/facilities').then(r => setFacilities(r.data.data));
  }, []);

  useEffect(() => {
    if (tab === 'inventory') api.get('/inventory', { params: { facility_id: facilityId || undefined } }).then(r => setInventory(r.data.data));
    if (tab === 'low-stock') api.get('/inventory/low-stock').then(r => setLowStock(r.data.data));
    if (tab === 'expiring') api.get('/inventory/expiring').then(r => setExpiring(r.data.data));
  }, [tab, facilityId]);

  const filtered = inventory.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
      </div>

      <div className="tabs">
        {['inventory', 'low-stock', 'expiring'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'inventory' ? 'All Stock' : t === 'low-stock' ? 'Low Stock' : 'Expiring Soon'}
          </div>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={14} />
              <input placeholder="Search medicine..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={{ width: 220 }} value={facilityId} onChange={e => setFacilityId(e.target.value)}>
              <option value="">All Facilities</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr>
                <th>Medicine</th><th>Category</th><th>Quantity</th><th>Reorder Level</th><th>Status</th>
              </tr></thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td><div style={{ fontWeight: 500 }}>{i.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{i.generic_name}</div></td>
                    <td>{i.category}</td>
                    <td>{i.quantity} {i.unit}</td>
                    <td>{i.reorder_level}</td>
                    <td><span className={`badge ${STATUS_BADGE[i.stock_status] || 'badge-gray'}`}>{i.stock_status}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="empty-state">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'low-stock' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Medicine</th><th>Facility</th><th>Quantity</th><th>Reorder Level</th><th>Safety Stock</th></tr></thead>
            <tbody>
              {lowStock.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.name}</td>
                  <td>{i.facility_name} <span className="badge badge-gray">{i.facility_type}</span></td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{i.quantity} {i.unit}</td>
                  <td>{i.reorder_level}</td>
                  <td>{i.safety_stock}</td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan={5} className="empty-state">No low stock items 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expiring' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Medicine</th><th>Batch</th><th>Facility</th><th>Expiry Date</th><th>Days Left</th><th>Qty</th></tr></thead>
            <tbody>
              {expiring.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.medicine_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.batch_number}</td>
                  <td>{b.facility_name}</td>
                  <td>{new Date(b.expiry_date).toLocaleDateString()}</td>
                  <td><span className={`badge ${b.days_remaining <= 30 ? 'badge-red' : b.days_remaining <= 60 ? 'badge-yellow' : 'badge-green'}`}>{b.days_remaining}d</span></td>
                  <td>{b.remaining_quantity} {b.unit}</td>
                </tr>
              ))}
              {expiring.length === 0 && <tr><td colSpan={6} className="empty-state">No expiring batches</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
