import { useEffect, useState } from 'react';
import { Truck, MapPin, Package, Send } from 'lucide-react';
import api from '../api';
import { PageHeader, Alert, EmptyState } from '../components/ui';

export default function Dispatch() {
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({ vehicle_id: '', driver_id: '', origin_facility_id: '', destination_facility_id: '', medicine_id: '', quantity: '', estimated_arrival: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get('/deliveries').then(r => setDeliveries(r.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get('/vehicles').then(r => setVehicles(r.data.data || [])).catch(() => {});
    api.get('/facilities').then(r => setFacilities(r.data.data || [])).catch(() => {});
    api.get('/medicines').then(r => setMedicines(r.data.data || [])).catch(() => {});
  }, []);

  const setField = key => e => setForm(prev => {
    const next = { ...prev, [key]: e.target.value };
    if (key === 'vehicle_id') {
      const vehicle = vehicles.find(v => v.id === e.target.value);
      next.driver_id = vehicle?.driver_id || '';
    }
    return next;
  });

  const submit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/deliveries', {
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id,
        origin_facility_id: form.origin_facility_id,
        destination_facility_id: form.destination_facility_id,
        estimated_arrival: form.estimated_arrival,
        items: [{ medicine_id: form.medicine_id, quantity: parseInt(form.quantity, 10) }]
      });
      setMessage('Dispatch scheduled successfully.');
      setForm({ vehicle_id: '', driver_id: '', origin_facility_id: '', destination_facility_id: '', medicine_id: '', quantity: '', estimated_arrival: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule dispatch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Dispatch Medicines" />

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="card p-6 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Schedule a Dispatch</h2>
            <p className="text-sm text-slate-500">Create a delivery for a warehouse or facility with available stock.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
            <Send size={18} /> Ready for dispatch
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="form-group">
            <label className="label">Vehicle</label>
            <select className="input" value={form.vehicle_id} onChange={setField('vehicle_id')} required>
              <option value="">Select vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number} • {v.type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Origin Warehouse</label>
            <select className="input" value={form.origin_facility_id} onChange={setField('origin_facility_id')} required>
              <option value="">Select origin</option>
              {facilities.filter(f => f.type === 'CENTRAL_WAREHOUSE').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Destination</label>
            <select className="input" value={form.destination_facility_id} onChange={setField('destination_facility_id')} required>
              <option value="">Select destination</option>
              {facilities.filter(f => ['HEALTH_CENTER', 'DISTRICT_HOSPITAL'].includes(f.type)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Estimated Arrival</label>
            <input type="datetime-local" className="input" value={form.estimated_arrival} onChange={setField('estimated_arrival')} required />
          </div>
          <div className="form-group">
            <label className="label">Medicine</label>
            <select className="input" value={form.medicine_id} onChange={setField('medicine_id')} required>
              <option value="">Select medicine</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Quantity</label>
            <input type="number" min="1" className="input" value={form.quantity} onChange={setField('quantity')} required />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Truck size={16} /> {loading ? 'Scheduling...' : 'Schedule Dispatch'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Delivery #</th>
                <th>From → To</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(delivery => (
                <tr key={delivery.id}>
                  <td className="font-mono text-xs">{delivery.delivery_number}</td>
                  <td>{delivery.origin_name} → {delivery.destination_name}</td>
                  <td>{delivery.plate_number || '—'}</td>
                  <td><span className={`badge ${delivery.status === 'DELIVERED' ? 'badge-green' : delivery.status === 'IN_TRANSIT' ? 'badge-yellow' : 'badge-blue'}`}>{delivery.status}</span></td>
                  <td>{delivery.estimated_arrival ? new Date(delivery.estimated_arrival).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No dispatch records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deliveries.length === 0 && !error && <EmptyState message="Start a dispatch to see real-time tracking data here." />}
    </div>
  );
}
