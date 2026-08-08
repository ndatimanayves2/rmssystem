import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/Dashboard';
import { useEffect, useState } from 'react';
import { StatCard } from '../components/ui';
import { Package, Truck, ClipboardList, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../api';

function SupplierDashboard() {
  const [pos, setPOs] = useState([]);
  const [stats, setStats] = useState({ pending: 0, accepted: 0, rejected: 0, delivered: 0 });

  useEffect(() => {
    api.get('/purchase-orders').then(r => {
      const data = r.data.data || [];
      setPOs(data.slice(0, 5));
      setStats({
        pending:   data.filter(p => p.status === 'SENT').length,
        accepted:  data.filter(p => p.status === 'ACCEPTED').length,
        rejected:  data.filter(p => p.status === 'REJECTED').length,
        delivered: data.filter(p => p.status === 'DELIVERED').length,
      });
    });
  }, []);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Supplier Dashboard</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock}        label="Pending Orders"    value={stats.pending}   color="amber"  />
        <StatCard icon={CheckCircle}  label="Accepted Orders"   value={stats.accepted}  color="green"  />
        <StatCard icon={AlertTriangle}label="Rejected Orders"   value={stats.rejected}  color="red"    />
        <StatCard icon={Truck}        label="Delivered Orders"  value={stats.delivered} color="blue"   />
      </div>
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">Recent Orders</div>
        <table className="table">
          <thead><tr><th>PO Number</th><th>Warehouse</th><th>Amount (RWF)</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {pos.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.po_number}</td>
                <td className="text-xs">{p.warehouse_name}</td>
                <td className="font-medium">{Number(p.total_amount).toLocaleString()}</td>
                <td><span className={`badge ${p.status === 'DELIVERED' ? 'badge-green' : p.status === 'REJECTED' ? 'badge-red' : p.status === 'ACCEPTED' ? 'badge-blue' : 'badge-yellow'}`}>{p.status}</span></td>
                <td className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {pos.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No orders yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarehouseDashboard() {
  const [inv, setInv] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data.data));
    api.get('/inventory').then(r => setInv(r.data.data?.slice(0, 5) || []));
  }, []);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Warehouse Dashboard</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Package}       label="Total Medicines"   value={stats?.total_medicines}      color="blue"  />
        <StatCard icon={AlertTriangle} label="Low Stock"         value={stats?.low_stock_count}      color="amber" />
        <StatCard icon={AlertTriangle} label="Expiring Soon"     value={stats?.expiring_soon_count}  color="red"   />
        <StatCard icon={Truck}         label="Active Deliveries" value={stats?.active_deliveries}    color="teal"  />
        <StatCard icon={ClipboardList} label="Pending Requests"  value={stats?.pending_requests}     color="purple"/>
      </div>
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">Current Stock</div>
        <table className="table">
          <thead><tr><th>Medicine</th><th>Quantity</th><th>Unit</th><th>Status</th></tr></thead>
          <tbody>
            {inv.map(i => (
              <tr key={i.id}>
                <td className="font-medium">{i.name}</td>
                <td>{i.quantity?.toLocaleString()}</td>
                <td className="text-slate-500">{i.unit}</td>
                <td><span className={`badge ${i.stock_status === 'ADEQUATE' ? 'badge-green' : i.stock_status === 'LOW' ? 'badge-yellow' : 'badge-red'}`}>{i.stock_status}</span></td>
              </tr>
            ))}
            {inv.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No inventory data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FacilityDashboard() {
  const [inv, setInv] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get('/inventory').then(r => setInv(r.data.data?.slice(0, 5) || []));
    api.get('/requests').then(r => setRequests(r.data.data?.slice(0, 5) || []));
  }, []);

  const lowStock = inv.filter(i => i.stock_status !== 'ADEQUATE').length;

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Health Facility Dashboard</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package}       label="Total Medicines"  value={inv.length}   color="blue"  />
        <StatCard icon={AlertTriangle} label="Low Stock"        value={lowStock}     color="amber" />
        <StatCard icon={ClipboardList} label="My Requests"      value={requests.length} color="purple" />
        <StatCard icon={Truck}         label="Pending Delivery" value={requests.filter(r => r.status === 'APPROVED').length} color="teal" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">Current Stock</div>
          <table className="table">
            <thead><tr><th>Medicine</th><th>Qty</th><th>Status</th></tr></thead>
            <tbody>
              {inv.map(i => (
                <tr key={i.id}>
                  <td className="font-medium text-sm">{i.name}</td>
                  <td>{i.quantity} {i.unit}</td>
                  <td><span className={`badge ${i.stock_status === 'ADEQUATE' ? 'badge-green' : i.stock_status === 'LOW' ? 'badge-yellow' : 'badge-red'}`}>{i.stock_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">My Requests</div>
          <table className="table">
            <thead><tr><th>Request #</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.request_number}</td>
                  <td><span className={`badge ${r.priority === 'EMERGENCY' ? 'badge-red' : 'badge-blue'}`}>{r.priority}</span></td>
                  <td><span className={`badge ${r.status === 'APPROVED' ? 'badge-green' : r.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    api.get('/deliveries').then(r => setDeliveries(r.data.data || []));
  }, []);

  const today = deliveries.filter(d => new Date(d.created_at).toDateString() === new Date().toDateString());
  const active = deliveries.filter(d => d.status === 'IN_TRANSIT');
  const done   = deliveries.filter(d => d.status === 'DELIVERED');

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Driver Dashboard</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Truck}        label="Today's Deliveries"  value={today.length}  color="blue"  />
        <StatCard icon={Clock}        label="Active Deliveries"   value={active.length} color="amber" />
        <StatCard icon={CheckCircle}  label="Completed"           value={done.length}   color="green" />
        <StatCard icon={Package}      label="Total Assigned"      value={deliveries.length} color="purple" />
      </div>
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">My Deliveries</div>
        <table className="table">
          <thead><tr><th>Delivery #</th><th>From</th><th>To</th><th>Status</th><th>ETA</th></tr></thead>
          <tbody>
            {deliveries.slice(0, 10).map(d => (
              <tr key={d.id}>
                <td className="font-mono text-xs">{d.delivery_number}</td>
                <td className="text-xs">{d.origin_name}</td>
                <td className="text-xs">{d.destination_name}</td>
                <td><span className={`badge ${d.status === 'DELIVERED' ? 'badge-green' : d.status === 'IN_TRANSIT' ? 'badge-blue' : 'badge-yellow'}`}>{d.status}</span></td>
                <td className="text-xs text-slate-500">{d.estimated_arrival ? new Date(d.estimated_arrival).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No deliveries assigned</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'MOH_ADMIN':         return <AdminDashboard />;
    case 'SUPPLIER':          return <SupplierDashboard />;
    case 'WAREHOUSE_MANAGER': return <WarehouseDashboard />;
    case 'DRIVER':            return <DriverDashboard />;
    default:                  return <FacilityDashboard />;
  }
}
