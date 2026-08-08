import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../api';

const STATUS_BADGE = { SENT: 'badge-blue', ACCEPTED: 'badge-green', REJECTED: 'badge-red', PREPARING: 'badge-yellow', SHIPPED: 'badge-blue', DELIVERED: 'badge-green' };

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', expected_delivery: '', notes: '', items: [{ medicine_id: '', quantity: '', unit_price: '' }] });
  const [error, setError] = useState('');

  const load = () => api.get('/purchase-orders').then(r => setPOs(r.data.data));

  useEffect(() => {
    load();
    api.get('/medicines').then(r => setMedicines(r.data.data));
    api.get('/facilities', { params: { type: 'SUPPLIER' } }).then(r => setSuppliers(r.data.data));
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { medicine_id: '', quantity: '', unit_price: '' }] }));
  const setItem = (i, k, v) => setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }; });

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      await api.post('/purchase-orders', { ...form, items: form.items.map(i => ({ ...i, quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) })) });
      setShowModal(false);
      setForm({ supplier_id: '', expected_delivery: '', notes: '', items: [{ medicine_id: '', quantity: '', unit_price: '' }] });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/purchase-orders/${id}/status`, { status });
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Purchase Orders</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New PO</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>PO Number</th><th>Supplier</th><th>Total (RWF)</th><th>Status</th><th>Expected</th><th>Actions</th></tr></thead>
          <tbody>
            {pos.map(po => (
              <tr key={po.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{po.po_number}</td>
                <td>{po.supplier_name}</td>
                <td>{Number(po.total_amount).toLocaleString()}</td>
                <td><span className={`badge ${STATUS_BADGE[po.status] || 'badge-gray'}`}>{po.status}</span></td>
                <td>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '—'}</td>
                <td>
                  {po.status === 'SENT' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm" onClick={() => updateStatus(po.id, 'ACCEPTED')}>Accept</button>
                      <button className="btn btn-danger btn-sm" onClick={() => updateStatus(po.id, 'REJECTED')}>Reject</button>
                    </div>
                  )}
                  {po.status === 'ACCEPTED' && <button className="btn btn-outline btn-sm" onClick={() => updateStatus(po.id, 'SHIPPED')}>Mark Shipped</button>}
                </td>
              </tr>
            ))}
            {pos.length === 0 && <tr><td colSpan={6} className="empty-state">No purchase orders</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Purchase Order</span>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier</label>
                  <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expected Delivery</label>
                  <input type="date" value={form.expected_delivery} onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, fontSize: 13 }}>Items</label>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addItem}><Plus size={12} /> Add</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <select value={item.medicine_id} onChange={e => setItem(i, 'medicine_id', e.target.value)} required>
                      <option value="">Medicine...</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} required min={1} />
                    <input type="number" placeholder="Unit Price" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} required min={0} step="0.01" />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
