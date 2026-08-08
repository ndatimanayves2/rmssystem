import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal w-full ${sizes[size]}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, color = 'gray' }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export function Spinner({ size = 'md' }) {
  return <div className={size === 'sm' ? 'spinner-sm' : 'spinner'} />;
}

export function StatCard({ icon: Icon, label, value, color = 'blue', trend, sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    amber:  'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export function EmptyState({ message = 'No data found', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      {icon && <div className="mb-3 opacity-30">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <div key={t.key} className={`tab-item${active === t.key ? ' active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
        </div>
      ))}
    </div>
  );
}
