import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from '../ChatWidget';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  const toggleDark = () => {
    setDark(d => !d);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen bg-slate-100 ${dark ? 'dark' : ''}`}>
      <Sidebar collapsed={collapsed} />
      <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <Topbar onToggleSidebar={() => setCollapsed(c => !c)} dark={dark} onToggleDark={toggleDark} />
        <main className="p-6">{children}</main>
      </div>
      <ChatWidget />
    </div>
  );
}
