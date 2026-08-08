import { useEffect, useState } from 'react';
import {
  Package, Truck, ClipboardList, AlertTriangle, Building2,
  Factory, Users, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { StatCard } from '../../components/ui';
import api from '../../api';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [consumption, setConsumption] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data.data));
    api.get('/reports/consumption').then(r => {
      const map = {};
      r.data.data.forEach(row => {
        const key = `${row.period_year}-${String(row.period_month).padStart(2,'0')}`;
        map[key] = (map[key] || 0) + row.quantity_consumed;
      });
      setConsumption(Object.entries(map).sort().slice(-12).map(([k,v]) => ({ month: k, qty: v })));
    });
    api.get('/requests', { params: { status: 'PENDING' } }).then(r => setRequests(r.data.data?.slice(0,5) || []));
    api.get('/deliveries').then(r => setDeliveries(r.data.data?.slice(0,5) || []));
  }, []);

  const facilityMap = {};
  stats?.facilities?.forEach(f => { facilityMap[f.type] = parseInt(f.count); });

  const pieData = stats?.facilities?.map((f, i) => ({
    name: f.type.replace(/_/g,' '), value: parseInt(f.count), color: COLORS[i]
  })) || [];

  const STATUS_BADGE = {
    PENDING: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red',
    IN_TRANSIT: 'badge-blue', DELIVERED: 'badge-green', ASSIGNED: 'badge-purple'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ministry of Health Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">National Medicine Supply Chain Overview</p>
        </div>
        <div className="text-sm text-slate-500">{new Date().toLocaleDateString('en-RW', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Package}       label="Total Medicines"     value={stats?.total_medicines?.toLocaleString()}    color="blue"   trend={5}  />
        <StatCard icon={ClipboardList} label="Pending Requests"    value={stats?.pending_requests}                    color="amber"  />
        <StatCard icon={Truck}         label="Active Deliveries"   value={stats?.active_deliveries}                   color="teal"   />
        <StatCard icon={AlertTriangle} label="Low Stock Items"     value={stats?.low_stock_count}                     color="red"    />
        <StatCard icon={Activity}      label="Expiring Soon"       value={stats?.expiring_soon_count}                 color="orange" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2} label="District Hospitals"  value={facilityMap['DISTRICT_HOSPITAL']  || 0} color="blue"   />
        <StatCard icon={Building2} label="Health Centers"      value={facilityMap['HEALTH_CENTER']      || 0} color="green"  />
        <StatCard icon={Factory}   label="Suppliers"           value={facilityMap['SUPPLIER']           || 0} color="purple" />
        <StatCard icon={Users}     label="Warehouses"          value={facilityMap['CENTRAL_WAREHOUSE']  || 0} color="indigo" />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Area Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Monthly Medicine Distribution</h3>
          {consumption.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={consumption}>
                <defs>
                  <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="qty" stroke="#3b82f6" strokeWidth={2} fill="url(#colorQty)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No consumption data yet</div>}
        </div>

        {/* Pie Chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Facilities by Type</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Recent Pending Requests</h3>
            <a href="/requests" className="text-xs text-blue-600 hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Request #</th><th>Facility</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.request_number}</td>
                    <td className="text-xs">{r.requesting_facility_name}</td>
                    <td><span className={`badge ${r.priority === 'EMERGENCY' ? 'badge-red' : r.priority === 'HIGH' ? 'badge-yellow' : 'badge-blue'}`}>{r.priority}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No pending requests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Recent Deliveries</h3>
            <a href="/deliveries" className="text-xs text-blue-600 hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Delivery #</th><th>Destination</th><th>Driver</th><th>Status</th></tr></thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">{d.delivery_number}</td>
                    <td className="text-xs">{d.destination_name}</td>
                    <td className="text-xs">{d.driver_name || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[d.status] || 'badge-gray'}`}>{d.status}</span></td>
                  </tr>
                ))}
                {deliveries.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No deliveries</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
