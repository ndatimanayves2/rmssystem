import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageHeader, StatCard } from '../components/ui';
import { MapPin, Truck, Building2, AlertTriangle } from 'lucide-react';
import api from '../api';
import useLiveVehicles from '../hooks/useLiveVehicles';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color, emoji) => L.divIcon({
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${emoji}</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Pulsing "live" icon to indicate real-time tracked vehicles
const makeLiveIcon = () => L.divIcon({
  html: `<div style="position:relative;width:36px;height:36px">
    <span style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.4);animation:gismap-pulse 1.6s ease-out infinite"></span>
    <span style="position:absolute;top:4px;left:4px;width:28px;height:28px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚚</span>
  </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const FACILITY_ICONS = {
  HEALTH_CENTER:      makeIcon('#22c55e', '🟢'),
  DISTRICT_HOSPITAL:  makeIcon('#3b82f6', '🔵'),
  CENTRAL_WAREHOUSE:  makeIcon('#f59e0b', '🟠'),
  SUPPLIER:           makeIcon('#8b5cf6', '🟣'),
};
const VEHICLE_ICON = makeIcon('#ef4444', '🚚');
const LIVE_VEHICLE_ICON = makeLiveIcon();

export default function GISMap() {
  const [facilities, setFacilities] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [filter, setFilter] = useState('ALL');

  const { livePositionsRef, connected, lastUpdate } = useLiveVehicles(true);

  useEffect(() => {
    api.get('/reports/facilities-map').then(r => setFacilities(r.data.data || []));
    api.get('/inventory/low-stock').then(r => setLowStock(r.data.data || []));
    loadVehicles();
    // fallback polling to keep active-vehicle list fresh even if socket drops
    const interval = setInterval(loadVehicles, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehicles = () => {
    api.get('/deliveries/active-vehicles').then(r => setVehicles(r.data.data || []));
  };

  const lowStockFacilityIds = new Set(lowStock.map(l => l.facility_id));

  // Merge live positions from socket into vehicle markers (higher priority than DB)
  const mergedVehicles = vehicles.map(v => {
    const live = livePositionsRef.current[v.id];
    if (!live) return v;
    return {
      ...v,
      current_latitude: live.latitude,
      current_longitude: live.longitude,
      speed: live.speed,
      last_location_update: live.timestamp,
      live: true,
    };
  });

  const filtered = filter === 'ALL' ? facilities
    : filter === 'LOW_STOCK' ? facilities.filter(f => lowStockFacilityIds.has(f.id))
    : facilities.filter(f => f.type === filter);

  const LEGEND = [
    { color: '#22c55e', label: 'Health Centers',    type: 'HEALTH_CENTER' },
    { color: '#3b82f6', label: 'District Hospitals', type: 'DISTRICT_HOSPITAL' },
    { color: '#f59e0b', label: 'Warehouses',         type: 'CENTRAL_WAREHOUSE' },
    { color: '#8b5cf6', label: 'Suppliers',          type: 'SUPPLIER' },
    { color: '#ef4444', label: 'Live Vehicles',      type: 'VEHICLE' },
    { color: '#3b82f6', label: 'Delivery Routes',    type: 'ROUTE' },
    { color: '#dc2626', label: 'Low Stock Areas',    type: 'LOW_STOCK' },
  ];

  return (
    <div>
      <PageHeader title="GIS Interactive Map">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <select className="input w-48 py-1.5" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All Facilities</option>
            <option value="HEALTH_CENTER">Health Centers</option>
            <option value="DISTRICT_HOSPITAL">Hospitals</option>
            <option value="CENTRAL_WAREHOUSE">Warehouses</option>
            <option value="SUPPLIER">Suppliers</option>
            <option value="LOW_STOCK">Low Stock Areas</option>
          </select>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2}    label="Health Centers"   value={facilities.filter(f=>f.type==='HEALTH_CENTER').length}     color="green"  />
        <StatCard icon={Building2}    label="Hospitals"        value={facilities.filter(f=>f.type==='DISTRICT_HOSPITAL').length}  color="blue"   />
        <StatCard icon={Truck}        label="Active Vehicles"  value={mergedVehicles.length}                                      color="amber"  sub={connected ? 'Live tracking' : 'Polling'} />
        <StatCard icon={AlertTriangle}label="Low Stock Areas"  value={lowStockFacilityIds.size}                                   color="red"    />
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 card overflow-hidden" style={{ height: 520 }}>
          <MapContainer center={[-1.9403, 29.8739]} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Facilities */}
            {filtered.map(f => f.latitude && f.longitude && (
              <Marker key={f.id} position={[parseFloat(f.latitude), parseFloat(f.longitude)]}
                icon={FACILITY_ICONS[f.type] || FACILITY_ICONS.HEALTH_CENTER}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-slate-500 text-xs">{f.type?.replace(/_/g,' ')}</div>
                    <div className="text-slate-500 text-xs">{f.district_name}, {f.province_name}</div>
                    {lowStockFacilityIds.has(f.id) && (
                      <div className="text-red-600 text-xs font-medium mt-1">⚠️ Low Stock Alert</div>
                    )}
                  </div>
                </Popup>
                {lowStockFacilityIds.has(f.id) && (
                  <Circle center={[parseFloat(f.latitude), parseFloat(f.longitude)]}
                    radius={3000} color="#dc2626" fillColor="#dc2626" fillOpacity={0.1} />
                )}
              </Marker>
            ))}

            {/* Delivery Routes (origin -> destination) */}
            {mergedVehicles.map(v => {
              const origin = (v.origin_lat && v.origin_lng) ? [parseFloat(v.origin_lat), parseFloat(v.origin_lng)] : null;
              const dest = (v.dest_lat && v.dest_lng) ? [parseFloat(v.dest_lat), parseFloat(v.dest_lng)] : null;
              const current = (v.current_latitude && v.current_longitude) ? [parseFloat(v.current_latitude), parseFloat(v.current_longitude)] : null;
              if (!origin || !dest) return null;
              const positions = current ? [origin, current, dest] : [origin, dest];
              return (
                <Polyline key={`route-${v.id}`} positions={positions}
                  color="#3b82f6" weight={3} opacity={0.6} dashArray="8 6" />
              );
            })}

            {/* Live Vehicles */}
            {mergedVehicles.map(v => v.current_latitude && v.current_longitude && (
              <Marker key={v.id} position={[parseFloat(v.current_latitude), parseFloat(v.current_longitude)]}
                icon={v.live ? LIVE_VEHICLE_ICON : VEHICLE_ICON}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">🚚 {v.plate_number}</div>
                    <div className="text-slate-500 text-xs">Driver: {v.driver_name}</div>
                    {v.origin_name && <div className="text-slate-500 text-xs">From: {v.origin_name}</div>}
                    {v.destination_name && <div className="text-slate-500 text-xs">→ {v.destination_name}</div>}
                    {v.delivery_number && <div className="text-blue-600 text-xs">{v.delivery_number}</div>}
                    {v.speed !== undefined && v.speed !== null && (
                      <div className="text-xs text-slate-500 mt-0.5">Speed: {Math.round(v.speed)} km/h</div>
                    )}
                    <div className={`text-xs mt-0.5 ${v.live ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                      {v.live ? '● Live' : 'Last known position'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Legend + Facility List */}
        <div className="flex flex-col gap-4">
          {/* Legend */}
          <div className="card p-4">
            <h4 className="font-semibold text-slate-800 mb-3 text-sm">Map Legend</h4>
            <div className="space-y-2">
              {LEGEND.map(l => (
                <div key={l.type} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
              <div className="pt-1 text-[10px] text-slate-400">
                {lastUpdate ? `Last live update: ${lastUpdate.toLocaleTimeString()}` : 'Waiting for live updates…'}
              </div>
            </div>
          </div>

          {/* Facility list */}
          <div className="card p-4 flex-1 overflow-y-auto" style={{ maxHeight: 340 }}>
            <h4 className="font-semibold text-slate-800 mb-3 text-sm">Facilities ({filtered.length})</h4>
            <div className="space-y-2">
              {filtered.slice(0, 20).map(f => (
                <div key={f.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50">
                  <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-slate-700">{f.name}</div>
                    <div className="text-[10px] text-slate-400">{f.district_name}</div>
                  </div>
                  {lowStockFacilityIds.has(f.id) && (
                    <span className="ml-auto text-red-500 text-[10px] font-bold">LOW</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes for live pulse (injected once) */}
      <style>{`
        @keyframes gismap-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

