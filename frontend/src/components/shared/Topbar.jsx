import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Menu, Moon, Sun, ChevronDown, User, Key, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function Topbar({ onToggleSidebar, dark, onToggleDark }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifRef = useRef();
  const userRef = useRef();

  useEffect(() => {
    api.get('/notifications', { params: { unread_only: 'true' } })
      .then(r => setNotifs(r.data.data || []))
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifs(n => n.filter(x => x.id !== id));
  };

  const NOTIF_COLORS = {
    LOW_STOCK: 'bg-amber-100 text-amber-700',
    OUT_OF_STOCK: 'bg-red-100 text-red-700',
    DELIVERY_STARTED: 'bg-blue-100 text-blue-700',
    DELIVERY_COMPLETED: 'bg-green-100 text-green-700',
    EMERGENCY_REQUEST: 'bg-red-100 text-red-700',
    NEW_REQUEST: 'bg-purple-100 text-purple-700',
    REQUEST_APPROVED: 'bg-green-100 text-green-700',
    REQUEST_REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 sticky top-0 z-30">
      <button onClick={onToggleSidebar} className="btn-ghost p-2 rounded-lg">
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9 py-1.5 text-sm bg-slate-50" placeholder="Search medicines, orders, facilities..." />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Dark mode */}
        <button onClick={onToggleDark} className="btn-ghost p-2 rounded-lg">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifs(v => !v)} className="btn-ghost p-2 rounded-lg relative">
            <Bell size={17} />
            {notifs.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notifs.length > 9 ? '9+' : notifs.length}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-sm">Notifications</span>
                {notifs.length > 0 && (
                  <button className="text-xs text-blue-600 hover:underline"
                    onClick={() => api.put('/notifications/read-all').then(() => setNotifs([]))}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No new notifications</div>
                ) : notifs.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 cursor-pointer"
                    onClick={() => markRead(n.id)}>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${NOTIF_COLORS[n.type] || 'bg-slate-100 text-slate-600'}`}>
                      {n.type?.replace(/_/g, ' ')}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{n.title}</div>
                      <div className="text-xs text-slate-500 truncate">{n.message}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button onClick={() => setShowUser(v => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
              <div className="text-[10px] text-slate-500">{user?.role?.replace(/_/g, ' ')}</div>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1">
              <button onClick={() => { navigate('/profile'); setShowUser(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <User size={14} /> Profile
              </button>
              <button onClick={() => { navigate('/settings'); setShowUser(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Key size={14} /> Change Password
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
