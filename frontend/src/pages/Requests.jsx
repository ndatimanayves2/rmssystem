import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const PRIORITY_BADGE = { NORMAL: 'badge-blue', HIGH: 'badge-yellow', EMERGENCY: 'badge-red' };
const STATUS_BADGE   = { PENDING: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red', FULFILLED: 'badge-blue', PO_CREATED: 'badge-purple' };

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState({ approving_facility_id: '', priority: 'NORMAL', notes: '', items: [{ medicine_id: '', quantity: '' }] });
  const [poForm, setPoForm] = useState({ supplier_id: '', expected_delivery: '', notes: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/requests').then(r => setRequests(r.data.data));

  useEffect(() => {
    load();
    api.get('/medicines').then(r => setMedicines(r.data.data));
    api.get('/facilities').then(r => setFacilities(r.data.data));
    api.get('/facilities', { params: { type: 'SUPPLIER' } }).then(r => setSuppliers(r.data.data));
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { medicine_id: '', quantity: '' }] }));
  const setItem = (i, k, v) => setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }; });

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      await api.post('/requests', { ...form, items: form.items.map(i => ({ ...i, quantity: parseInt(i.quantity) })) });
      setShowModal(false);
      setForm({ approving_facility_id: '', priority: 'NORMAL', notes: '', items: [{ medicine_id: '', quantity: '' }] });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  };

  const approve = async (id) => {
    const req = requests.find(r => r.id === id);
    const approved_items = req.items.map(i => ({ medicine_id: i.medicine_id, approved_quantity: i.requested_quantity }));
    await api.put(`/requests/${id}/approve`, { approved_items });
    load();
  };

  const reject = async (id) => {
    const notes = prompt('Reason for rejection:');
    if (!notes) return;
    await api.put(`/requests/${id}/reject`, { notes });
    load();
  };

  const openPOModal = (request) => {
    setSelectedRequest(request);
    setPoForm({ supplier_id: '', expected_delivery: '', notes: '' });
    setError('');
    setShowPOModal(true);
  };

  const submitPO = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await api.post(`/requests/${selectedRequest.id}/create-po`, poForm);
      setShowPOModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create PO');
    }
  };

  const canApprove = ['MOH_ADMIN', 'WAREHOUSE_MANAGER', 'DISTRICT_HOSPITAL'].includes(user?.role);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Medicine Requests</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New Request</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Request #</th><th>From</th><th>Priority</th><th>Status</th><th>Items</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.request_number}</td>
                <td>{r.requesting_facility_name}</td>
                <td><span className={`badge ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                <td>{r.items?.length} items</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  {canApprove && r.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm" onClick={() => approve(r.id)}><Check size={12} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => reject(r.id)}><X size={12} /></button>
                    </div>
                  )}
                  {['MOH_ADMIN', 'WAREHOUSE_MANAGER'].includes(user?.role) && r.status === 'APPROVED' && (
                    <button className="btn btn-primary btn-sm" onClick={() => openPOModal(r)}>PO</button>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={7} className="empty-state">No requests found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Medicine Request</span>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Approving Facility</label>
                  <select value={form.approving_facility_id} onChange={e => setForm(f => ({ ...f, approving_facility_id: e.target.value }))} required>
                    <option value="">Select...</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option>NORMAL</option><option>HIGH</option><option>EMERGENCY</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, fontSize: 13 }}>Items</label>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addItem}><Plus size={12} /> Add</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="form-row" style={{ marginBottom: 8 }}>
                    <select value={item.medicine_id} onChange={e => setItem(i, 'medicine_id', e.target.value)} required>
                      <option value="">Select medicine...</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" placeholder="Quantity" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} required min={1} />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPOModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowPOModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create PO from {selectedRequest.request_number}</span>
              <button onClick={() => setShowPOModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={submitPO}>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier</label>
                  <select value={poForm.supplier_id} onChange={e => setPoForm(f => ({ ...f, supplier_id: e.target.value }))} required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expected Delivery</label>
                  <input type="date" value={poForm.expected_delivery} onChange={e => setPoForm(f => ({ ...f, expected_delivery: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea rows={2} value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4 className="section-title">Approved Items</h4>
                <ul className="list-disc" style={{ paddingLeft: 18 }}>
                  {selectedRequest.items.map(item => (
                    <li key={item.medicine_id}>{item.medicine_name || item.medicine_id} — {item.requested_quantity} {item.unit || ''}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPOModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
