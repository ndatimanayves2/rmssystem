import { useEffect, useState } from 'react';
import { Truck, MapPin } from 'lucide-react';
import api from '../api';

const STATUS_BADGE = { ASSIGNED: 'badge-blue', IN_TRANSIT: 'badge-yellow', DELIVERED: 'badge-green', FAILED: 'badge-red' };

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tab, setTab] = useState('deliveries');

  useEffect(() => {
    api.get('/deliveries').then(r => setDeliveries(r.data.data));
    api.get('/deliveries/active-vehicles').then(r => setVehicles(r.data.data));
  }, []);

  const startDelivery = async (id) => {
    await api.put(`/deliveries/${id}/start`);
    api.get('/deliveries').then(r => setDeliveries(r.data.data));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Deliveries</h1>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'deliveries' ? ' active' : ''}`} onClick={() => setTab('deliveries')}>All Deliveries</div>
        <div className={`tab${tab === 'vehicles' ? ' active' : ''}`} onClick={() => setTab('vehicles')}>Active Vehicles ({vehicles.length})</div>
      </div>

      {tab === 'deliveries' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Delivery #</th><th>From → To</th><th>Driver</th><th>Vehicle</th><th>Status</th><th>Est. Arrival</th><th>Actions</th></tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.delivery_number}</td>
                  <td>
                    <div style={{ fontSize: 12 }}>{d.origin_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>→ {d.destination_name}</div>
                  </td>
                  <td>{d.driver_name || '—'}<br /><span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.driver_phone}</span></td>
                  <td>{d.plate_number || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[d.status] || 'badge-gray'}`}>{d.status}</span></td>
                  <td>{d.estimated_arrival ? new Date(d.estimated_arrival).toLocaleString() : '—'}</td>
                  <td>
                    {d.status === 'ASSIGNED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => startDelivery(d.id)}>
                        <Truck size={12} /> Start
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && <tr><td colSpan={7} className="empty-state">No deliveries found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="grid-3">
          {vehicles.map(v => (
            <div key={v.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#dbeafe', borderRadius: 8, padding: 8 }}>
                  <Truck size={20} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{v.plate_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.type}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Driver: <strong>{v.driver_name || '—'}</strong></div>
              {v.delivery_number && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Delivery: {v.delivery_number}</div>}
              {v.destination_name && <div style={{ fontSize: 12, color: 'var(--muted)' }}>→ {v.destination_name}</div>}
              {v.current_latitude && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', marginTop: 8 }}>
                  <MapPin size={12} /> {Number(v.current_latitude).toFixed(4)}, {Number(v.current_longitude).toFixed(4)}
                </div>
              )}
            </div>
          ))}
          {vehicles.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}>No active vehicles</div>}
        </div>
      )}
    </div>
  );
}
