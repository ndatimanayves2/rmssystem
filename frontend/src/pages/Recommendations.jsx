import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Recommendations() {
  const { user } = useAuth();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [facilityId, setFacilityId] = useState(user?.facilityId || '');
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    api.get('/facilities').then(r => setFacilities(r.data.data || []));
  }, []);

  const load = (fid) => {
    setLoading(true);
    api.get('/ai/recommendations', { params: { facility_id: fid || undefined } })
      .then(r => setRecs(r.data.data || []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(facilityId); }, [facilityId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Recommendations</h1>
          <p className="text-sm text-slate-500">Recommended purchase quantities based on AI forecasts and current stock.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={facilityId} onChange={e => setFacilityId(e.target.value)} className="input">
            <option value="">All Facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {loading && <span className="spinner" />}
        </div>
      </div>

      <div className="card p-0">
        <table className="table">
          <thead>
            <tr><th>Medicine</th><th>Facility</th><th>Predicted</th><th>Current</th><th>Safety Stock</th><th>Recommended</th><th>Confidence</th></tr>
          </thead>
          <tbody>
            {recs.map(r => (
              <tr key={`${r.facility_id}_${r.medicine_id}`}>
                <td style={{ fontWeight: 600 }}>{r.medicine_name || r.medicine_id}</td>
                <td style={{ fontSize: 12 }}>{r.facility_id}</td>
                <td>{r.predicted_total}</td>
                <td>{r.current_quantity}</td>
                <td>{r.safety_stock}</td>
                <td><strong>{r.recommended_purchase}</strong> {r.unit || ''}</td>
                <td>{Math.round((r.avg_confidence||0))}%</td>
              </tr>
            ))}
            {!loading && recs.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No recommendations available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
