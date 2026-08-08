import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ClipboardList, ShoppingCart,
  Truck, BarChart2, Bell, LogOut, Users, Brain
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/requests', icon: ClipboardList, label: 'Requests' },
  { to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
  { to: '/deliveries', icon: Truck, label: 'Deliveries' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/forecast', icon: Brain, label: 'AI Forecast' },
  { to: '/users', icon: Users, label: 'Users', adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>🏥 MedSupply</h2>
          <p>Rwanda Supply Chain</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">Main Menu</div>
          {NAV.filter(n => !n.adminOnly || user?.role === 'MOH_ADMIN').map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" style={{ width: '100%' }} onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 13 }}>
            {user?.role?.replace(/_/g, ' ')}
          </span>
          <div className="topbar-right">
            <button className="notif-btn"><Bell size={18} /></button>
            <div className="avatar">{initials}</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{user?.name}</span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
