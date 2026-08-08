import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import {
  LayoutDashboard, Package, Truck, ClipboardList, ShoppingCart,
  BarChart2, Bell, LogOut, Users, Brain, Map, Building2,
  Warehouse, Stethoscope, QrCode, Settings,
  Navigation, Factory, Receipt, ArrowDownToLine, ArrowUpFromLine,
  UserCircle, ShieldCheck, Bot
} from 'lucide-react';

const NAV_BY_ROLE = {
  MOH_ADMIN: [
    { section: 'Main' },
    { to: '/',                    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/medicines',           icon: Package,         label: 'Medicines' },
    { to: '/suppliers',           icon: Factory,         label: 'Suppliers' },
    { to: '/warehouses',          icon: Warehouse,       label: 'Warehouses' },
    { to: '/facilities',          icon: Building2,       label: 'Health Facilities' },
    { section: 'Operations' },
    { to: '/requests',            icon: ClipboardList,   label: 'Medicine Requests' },
    { to: '/purchase-orders',     icon: ShoppingCart,    label: 'Purchase Orders' },
{ to: '/deliveries',          icon: Truck,           label: 'Deliveries' },
    { section: 'Intelligence' },
    { to: '/gis-map',             icon: Map,             label: 'GIS Map' },
    { to: '/forecast',            icon: Brain,           label: 'AI Forecast' },
    { to: '/recommendations',     icon: ShieldCheck,    label: 'Recommendations' },
    { to: '/ai-assistant',        icon: Bot,             label: 'AI Assistant' },
    { to: '/reports',             icon: BarChart2,       label: 'Reports' },
    { section: 'Admin' },
    { to: '/users',               icon: Users,           label: 'Users & Roles' },
    { to: '/settings',            icon: Settings,        label: 'Settings' },
  ],
  WAREHOUSE_MANAGER: [
    { section: 'Main' },
    { to: '/',                    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inventory',           icon: Package,         label: 'Stock Management' },
    { to: '/receiving',           icon: ArrowDownToLine, label: 'Receive Medicines' },
    { to: '/dispatch',            icon: ArrowUpFromLine, label: 'Dispatch Medicines' },
    { to: '/scan-qr',             icon: QrCode,          label: 'QR Scanner' },
    { section: 'Operations' },
    { to: '/requests',            icon: ClipboardList,   label: 'Medicine Requests' },
    { to: '/deliveries',          icon: Truck,           label: 'Deliveries' },
    { to: '/reports',             icon: BarChart2,       label: 'Reports' },
    { to: '/notifications',       icon: Bell,            label: 'Notifications' },
  ],
  DISTRICT_HOSPITAL: [
    { section: 'Main' },
    { to: '/',                    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inventory',           icon: Package,         label: 'Current Stock' },
    { to: '/requests',            icon: ClipboardList,   label: 'Medicine Requests' },
    { to: '/deliveries',          icon: Truck,           label: 'Track Delivery' },
    { to: '/scan-qr',             icon: QrCode,          label: 'Receive Medicine' },
    { section: 'Reports' },
    { to: '/reports',             icon: BarChart2,       label: 'Reports' },
    { to: '/notifications',       icon: Bell,            label: 'Notifications' },
  ],
  HEALTH_CENTER: [
    { section: 'Main' },
    { to: '/',                    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inventory',           icon: Package,         label: 'Current Stock' },
    { to: '/requests',            icon: ClipboardList,   label: 'Request Medicine' },
    { to: '/deliveries',          icon: Truck,           label: 'Track Delivery' },
    { to: '/scan-qr',             icon: QrCode,          label: 'Scan QR' },
    { to: '/reports',             icon: BarChart2,       label: 'Reports' },
    { to: '/notifications',       icon: Bell,            label: 'Notifications' },
  ],
  SUPPLIER: [
    { section: 'Main' },
    { to: '/',                    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inventory',           icon: Package,         label: 'Inventory' },
    { to: '/purchase-orders',     icon: ShoppingCart,    label: 'Orders' },
    { to: '/deliveries',          icon: Truck,           label: 'Deliveries' },
    { to: '/invoices',            icon: Receipt,         label: 'Invoices' },
    { to: '/reports',             icon: BarChart2,       label: 'Reports' },
    { to: '/notifications',       icon: Bell,            label: 'Notifications' },
  ],
  DRIVER: [
    { section: 'Main' },
    { to: '/',                    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/deliveries',          icon: Truck,           label: 'My Deliveries' },
    { to: '/gis-map',             icon: Navigation,      label: 'Map Navigation' },
    { to: '/scan-qr',             icon: QrCode,          label: 'QR Verification' },
    { to: '/profile',             icon: UserCircle,      label: 'Profile' },
  ],
};

export default function Sidebar({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.HEALTH_CENTER;

  return (
    <aside className={`fixed left-0 top-0 bottom-0 bg-slate-900 flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
{/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <Logo size={34} showText={!collapsed} variant="light" textSize="text-sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {nav.map((item, i) => {
          if (item.section) {
            return !collapsed ? (
              <div key={i} className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 pt-4 pb-1">
                {item.section}
              </div>
            ) : <div key={i} className="my-2 border-t border-slate-800" />;
          }
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''} ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}>
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{user?.name}</div>
              <div className="text-slate-500 text-[10px] truncate">{user?.role?.replace(/_/g, ' ')}</div>
            </div>
          </div>
        )}
        <button onClick={() => { logout(); navigate('/login'); }}
          className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
