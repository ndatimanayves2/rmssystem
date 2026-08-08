import { useEffect, useState } from 'react';
import { Package, QrCode, Plus, Check } from 'lucide-react';
import api from '../api';
import { PageHeader, Alert, EmptyState } from '../components/ui';

export default function Receiving() {
  const [batches, setBatches] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({ facility_id: '', medicine_id: '', batch_number: '', expiry_date: '', quantity: '', unit_price: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get('/inventory/batches').then(r => setBatches(r.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get('/facilities', { params: { type: 'CENTRAL_WAREHOUSE' } }).then(r => setFacilities(r.data.data || [])).catch(() => {});
    api.get('/medicines').then(r => setMedicines(r.data.data || [])).catch(() => {});
  }, []);

  const setField = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/inventory/batches', {
        facility_id: form.facility_id,
        medicine_id: form.medicine_id,
        batch_number: form.batch_number,
        expiry_date: form.expiry_date,
        quantity: parseInt(form.quantity, 10),
        unit_price: parseFloat(form.unit_price)
      });
      setMessage('Medicine batch received successfully.');
      setForm({ facility_id: '', medicine_id: '', batch_number: '', expiry_date: '', quantity: '', unit_price: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to receive medicine batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Receive Medicines" />

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Receive shipments</div>
          <div className="text-3xl font-semibold mt-3">{batches.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Warehouse hubs</div>
          <div className="text-3xl font-semibold mt-3">{facilities.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Active medicines</div>
          <div className="text-3xl font-semibold mt-3">{medicines.length}</div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="card p-6 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Receive New Batch</h2>
            <p className="text-sm text-slate-500">Record incoming medicine shipments into warehouse stock.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
            <QrCode size={18} /> Scan QR for batch verification
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="form-group">
            <label className="label">Warehouse</label>
            <select className="input" value={form.facility_id} onChange={setField('facility_id')} required>
              <option value="">Select warehouse</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Medicine</label>
            <select className="input" value={form.medicine_id} onChange={setField('medicine_id')} required>
              <option value="">Select medicine</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Batch Number</label>
            <input className="input" value={form.batch_number} onChange={setField('batch_number')} required />
          </div>
          <div className="form-group">
            <label className="label">Expiry Date</label>
            <input type="date" className="input" value={form.expiry_date} onChange={setField('expiry_date')} required />
          </div>
          <div className="form-group">
            <label className="label">Quantity</label>
            <input type="number" min="1" className="input" value={form.quantity} onChange={setField('quantity')} required />
          </div>
          <div className="form-group">
            <label className="label">Unit Price (RWF)</label>
            <input type="number" min="0" step="0.01" className="input" value={form.unit_price} onChange={setField('unit_price')} required />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16} /> {loading ? 'Receiving...' : 'Receive Batch'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Medicine</th>
                <th>Warehouse</th>
                <th>Qty</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id}>
                  <td className="font-mono text-xs">{batch.batch_number}</td>
                  <td>{batch.medicine_name}</td>
                  <td>{batch.facility_name}</td>
                  <td>{batch.remaining_quantity}</td>
                  <td>{batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No received batches yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {batches.length === 0 && !error && <EmptyState message="Awaiting batch receipts." />}
    </div>
  );
}
