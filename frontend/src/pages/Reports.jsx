import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

export default function Reports() {
  const [consumption, setConsumption] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [filters, setFilters] = useState({ facility_id: '', year: new Date().getFullYear(), month: '' });

  const load = useCallback(() => {
    const params = {};
    if (filters.facility_id) params.facility_id = filters.facility_id;
    if (filters.year) params.year = filters.year;
    if (filters.month) params.month = filters.month;
    api.get('/reports/consumption', { params }).then(r => setConsumption(r.data.data));
  }, [filters.facility_id, filters.year, filters.month]);

  useEffect(() => {
    api.get('/facilities').then(r => setFacilities(r.data.data));
    load();
  }, [load]);

  const chartData = consumption.reduce((acc, row) => {
    const key = row.medicine_name;
    const existing = acc.find(a => a.name === key);
    if (existing) existing.qty += row.quantity_consumed;
    else acc.push({ name: key, qty: row.quantity_consumed });
    return acc;
  }, []).sort((a, b) => b.qty - a.qty).slice(0, 10);

  const exportFile = (type, format) => {
    const token = localStorage.getItem('token');
    // Build the export URL from the env-based API base (falls back to relative '/api').
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    window.open(`${apiBase}/reports/export/${format}/${type}?token=${token}`, '_blank');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => exportFile('inventory', 'pdf')}><Download size={14} /> Inventory PDF</button>
          <button className="btn btn-outline" onClick={() => exportFile('inventory', 'excel')}><Download size={14} /> Inventory Excel</button>
          <button className="btn btn-outline" onClick={() => exportFile('expiry', 'pdf')}><Download size={14} /> Expiry PDF</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label>Facility</label>
            <select value={filters.facility_id} onChange={e => setFilters(f => ({ ...f, facility_id: e.target.value }))}>
              <option value="">All Facilities</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Year</label>
            <input type="number" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} min={2020} max={2030} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Month</label>
            <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
              <option value="">All</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={load}>Apply</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Top 10 Consumed Medicines</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="qty" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">No data</div>}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Consumption Details</div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>Medicine</th><th>Facility</th><th>Period</th><th>Qty</th></tr></thead>
              <tbody>
                {consumption.slice(0, 50).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.medicine_name}</td>
                    <td style={{ fontSize: 12 }}>{r.facility_name}</td>
                    <td style={{ fontSize: 12 }}>{r.period_month}/{r.period_year}</td>
                    <td>{r.quantity_consumed} {r.unit}</td>
                  </tr>
                ))}
                {consumption.length === 0 && <tr><td colSpan={4} className="empty-state">No records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
