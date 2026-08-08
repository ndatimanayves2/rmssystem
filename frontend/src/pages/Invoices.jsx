import { useEffect, useState } from 'react';
import { Receipt, Search, CreditCard, Calendar } from 'lucide-react';
import api from '../api';
import { PageHeader, EmptyState } from '../components/ui';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/purchase-orders')
      .then(r => {
        const pos = r.data.data || [];
        setInvoices(pos.map(po => ({
          id: po.id,
          invoice_number: `INV-${po.po_number || po.id}`,
          supplier: po.supplier_name,
          amount: po.total_amount,
          status: po.status === 'DELIVERED' ? 'PAID' : 'PENDING',
          due_date: po.expected_delivery,
        })));
      })
      .catch(err => setError(err.response?.data?.error || 'Unable to load invoices'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-sm text-slate-500">Monitor invoice status and payment readiness for supplier deliveries.</p>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search invoice number or supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <CreditCard size={16} /> Export Invoices
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.supplier}</td>
                  <td>{inv.amount ? Number(inv.amount).toLocaleString() : '—'}</td>
                  <td><span className={`badge ${inv.status === 'PAID' ? 'badge-green' : 'badge-yellow'}`}>{inv.status}</span></td>
                  <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'TBD'}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No invoices available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!error && loading && <EmptyState message="Loading invoices..." />}
    </div>
  );
}
