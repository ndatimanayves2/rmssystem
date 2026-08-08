import { useCallback, useEffect, useState } from 'react';
import { Brain, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Forecast() {
  const { user } = useAuth();
  const [forecasts, setForecasts] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilityId, setFacilityId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (fid) => {
    setLoading(true);
    try {
      const params = { facility_id: fid || user?.facilityId || undefined };
      const [fRes, cRes] = await Promise.all([
        api.get('/ai/forecasts', { params }),
        api.get('/reports/consumption', { params: { facility_id: params.facility_id } }),
      ]);
      setForecasts(fRes.data.data);
      setConsumption(cRes.data.data);
    } finally { setLoading(false); }
  }, [user?.facilityId]);

  useEffect(() => {
    api.get('/facilities').then(r => setFacilities(r.data.data));
    load('');
  }, [load]);

  // Build chart data: actual + forecast per medicine (top 5)
  const topMedicines = [...new Set(forecasts.map(f => f.medicine_name))].slice(0, 5);

  const chartData = (() => {
    const map = {};
    consumption.forEach(r => {
      const key = `${r.period_year}-${String(r.period_month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { period: key, type: 'actual' };
      if (topMedicines.includes(r.medicine_name)) map[key][r.medicine_name] = (map[key][r.medicine_name] || 0) + r.quantity_consumed;
    });
    forecasts.forEach(f => {
      const key = `${f.forecast_year}-${String(f.forecast_month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { period: key, type: 'forecast' };
      if (topMedicines.includes(f.medicine_name)) map[key][f.medicine_name] = f.predicted_quantity;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  })();

  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626'];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">AI Demand Forecast</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select style={{ width: 220 }} value={facilityId} onChange={e => { setFacilityId(e.target.value); load(e.target.value); }}>
            <option value="">All Facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {loading && <span className="spinner" />}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #7c3aed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} color="#7c3aed" />
          <div>
            <div style={{ fontWeight: 600 }}>Linear Regression Model</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Forecasts based on historical consumption trends. Confidence score indicates model accuracy (R²).</div>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Actual vs Forecasted Consumption (Top 5 Medicines)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {topMedicines.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2} dot={false} strokeDasharray={chartData.find(d => d[name] && d.type === 'forecast') ? '4 2' : undefined} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Medicine</th><th>Facility</th><th>Period</th><th>Predicted Qty</th><th>Confidence</th></tr></thead>
          <tbody>
            {forecasts.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{f.medicine_name}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>—</td>
                <td>{f.forecast_month}/{f.forecast_year}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={13} color="#16a34a" />
                    <strong>{f.predicted_quantity}</strong> {f.unit}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                      <div style={{ width: `${f.confidence_score}%`, height: '100%', background: f.confidence_score >= 70 ? '#16a34a' : f.confidence_score >= 40 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, minWidth: 36 }}>{f.confidence_score}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {forecasts.length === 0 && !loading && (
              <tr><td colSpan={5} className="empty-state">No forecasts available. Record consumption data first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
