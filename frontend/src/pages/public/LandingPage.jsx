import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../../components/Logo';
import {
  Brain, Truck, QrCode, Package, Bell, BarChart2,
  MapPin, Phone, Mail, Menu, X, ChevronRight,
  Stethoscope, Building2, Factory, Users, CheckCircle, ArrowRight
} from 'lucide-react';
// Public axios instance: attaches the token if present, but does NOT redirect
// to /login on a 401 (unlike the shared `api` instance). This keeps the landing
// page accessible to logged-out visitors when they navigate to it via the logo.
// Base URL comes from frontend/.env (VITE_API_URL), falls back to '/api'.
const PUBLIC_API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const publicApi = axios.create({ baseURL: PUBLIC_API_BASE_URL });
publicApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const FEATURES = [
  { icon: Brain,    title: 'AI Demand Forecasting',    desc: 'Predict medicine needs using machine learning based on historical consumption patterns.',    color: 'purple' },
  { icon: Truck,    title: 'Real-time GPS Tracking',   desc: 'Track every delivery vehicle live on an interactive map across Rwanda.',                    color: 'blue'   },
  { icon: QrCode,   title: 'QR Code Verification',     desc: 'Scan and verify medicine batches instantly to prevent counterfeits and errors.',             color: 'green'  },
  { icon: Package,  title: 'Smart Inventory',          desc: 'Automated stock monitoring with low-stock alerts and expiry notifications.',                  color: 'amber'  },
  { icon: Bell,     title: 'Instant Notifications',    desc: 'Real-time alerts for emergency requests, deliveries, and critical stock levels.',             color: 'red'    },
  { icon: BarChart2,'title': 'Advanced Analytics',     desc: 'Comprehensive reports and dashboards for data-driven decision making.',                       color: 'teal'   },
];

const ICON_COLORS = {
  purple: 'bg-purple-100 text-purple-600',
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  amber:  'bg-amber-100 text-amber-600',
  red:    'bg-red-100 text-red-600',
  teal:   'bg-teal-100 text-teal-600',
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
publicApi.get('/dashboard/stats').then(r => setStats(r.data.data)).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const facilityMap = {};
  stats?.facilities?.forEach(f => { facilityMap[f.type] = parseInt(f.count); });

  const STATS = [
    { icon: Factory,   label: 'Total Suppliers',      value: facilityMap['SUPPLIER']          || '12+',  color: 'text-purple-600' },
    { icon: Building2, label: 'District Hospitals',   value: facilityMap['DISTRICT_HOSPITAL'] || '37+',  color: 'text-blue-600'   },
    { icon: Stethoscope,label:'Health Centers',       value: facilityMap['HEALTH_CENTER']     || '428+', color: 'text-green-600'  },
    { icon: Package,   label: 'Medicines Available',  value: stats?.total_medicines           || '150+', color: 'text-amber-600'  },
    { icon: Truck,     label: 'Deliveries Completed', value: '2,400+',                                   color: 'text-teal-600'   },
    { icon: Users,     label: 'Active Users',         value: '500+',                                     color: 'text-red-600'    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex items-center justify-between h-16">
            <Logo size={32} showText variant={scrolled ? 'dark' : 'light'} textSize="text-lg" />

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {['Home', 'About', 'Services', 'Suppliers', 'Health Facilities', 'Contact'].map(item => (
                <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className={`text-sm font-medium hover:text-blue-400 transition-colors ${scrolled ? 'text-slate-600' : 'text-white/90'}`}>
                  {item}
                </a>
              ))}
              <button onClick={() => navigate('/login')}
                className="btn btn-primary btn-sm">
                Login <ChevronRight size={14} />
              </button>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-slate-900 px-4 py-4 space-y-2">
            {['Home', 'About', 'Services', 'Suppliers', 'Health Facilities', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="block text-white/80 py-2 text-sm hover:text-white"
                onClick={() => setMenuOpen(false)}>{item}</a>
            ))}
            <button onClick={() => navigate('/login')} className="btn btn-primary w-full justify-center mt-2">Login</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="home" className="relative min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Rwanda National Health Supply Chain
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
                Improving Medicine Supply
                <span className="text-blue-400"> Across Rwanda</span>
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                A smart, AI-powered platform connecting the Ministry of Health, warehouses, hospitals,
                and health centers to ensure every Rwandan has access to essential medicines.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => navigate('/login')}
                  className="btn btn-primary btn-lg">
                  Get Started <ArrowRight size={18} />
                </button>
                <a href="#about"
                  className="btn btn-lg border border-white/20 text-white hover:bg-white/10">
                  Learn More
                </a>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-12">
                {[
                  { value: '428+', label: 'Health Centers' },
                  { value: '37+',  label: 'Hospitals' },
                  { value: '99%',  label: 'Uptime' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-slate-400 text-xs ml-2">Live Dashboard</span>
                  </div>
                  {/* Mock dashboard preview */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Medicines', value: '15,300', color: 'bg-blue-500' },
                      { label: 'Deliveries', value: '98', color: 'bg-green-500' },
                      { label: 'Low Stock', value: '23', color: 'bg-amber-500' },
                      { label: 'Requests', value: '126', color: 'bg-purple-500' },
                    ].map(c => (
                      <div key={c.label} className="bg-white/5 rounded-xl p-3">
                        <div className={`w-2 h-2 rounded-full ${c.color} mb-2`} />
                        <div className="text-white font-bold text-lg">{c.value}</div>
                        <div className="text-slate-400 text-xs">{c.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mock chart bars */}
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-slate-400 text-xs mb-3">Monthly Distribution</div>
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-500/60 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <CheckCircle size={12} /> Live Tracking
                </div>
                <div className="absolute -bottom-4 -left-4 bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Brain size={12} /> AI Powered
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">About the System</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              The Smart Medical Supply Chain System is a national platform developed to digitize and optimize
              the distribution of medicines across Rwanda's entire health system.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🏥', title: 'Ministry of Health', desc: 'Central oversight and management of the entire national medicine supply chain.' },
              { icon: '🏭', title: 'Suppliers & Warehouses', desc: 'Efficient procurement, storage, and distribution of medicines nationwide.' },
              { icon: '💊', title: 'Health Facilities', desc: 'Real-time stock visibility and seamless medicine request management.' },
            ].map(c => (
              <div key={c.title} className="card p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{c.icon}</div>
                <h3 className="font-semibold text-slate-800 mb-2">{c.title}</h3>
                <p className="text-slate-500 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Key Features</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Cutting-edge technology to ensure medicines reach every corner of Rwanda.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1 duration-200">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${ICON_COLORS[f.color]}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">System at a Glance</h2>
            <p className="text-blue-200">Real-time statistics from across Rwanda</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center border border-white/20">
                <s.icon size={24} className="text-white/80 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-blue-200 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HEALTH FACILITIES */}
      <section id="health-facilities" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Health Facilities Network</h2>
            <p className="text-slate-500">Connected facilities across all 5 provinces of Rwanda</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: '🏛️', label: 'Central Warehouse',  count: facilityMap['CENTRAL_WAREHOUSE'] || 1,   color: 'border-blue-500' },
              { icon: '🏥', label: 'District Hospitals', count: facilityMap['DISTRICT_HOSPITAL']  || 37,  color: 'border-green-500' },
              { icon: '🏨', label: 'Health Centers',     count: facilityMap['HEALTH_CENTER']      || 428, color: 'border-amber-500' },
              { icon: '🏭', label: 'Suppliers',          count: facilityMap['SUPPLIER']           || 12,  color: 'border-purple-500' },
            ].map(f => (
              <div key={f.label} className={`card p-6 text-center border-t-4 ${f.color}`}>
                <div className="text-4xl mb-3">{f.icon}</div>
                <div className="text-3xl font-bold text-slate-800">{f.count}</div>
                <div className="text-slate-500 text-sm mt-1">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-400 mb-8">Login to access your dashboard and manage the supply chain efficiently.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg">
            Login to System <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
<div>
              <Logo size={32} showText variant="light" textSize="text-lg" />
              <p className="text-sm leading-relaxed mt-4">
                Smart Medical Supply Chain System for Rwanda's national health infrastructure.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                {['Home', 'About', 'Services', 'Contact'].map(l => (
                  <li key={l}><a href={`#${l.toLowerCase()}`} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">System</h4>
              <ul className="space-y-2 text-sm">
                {['Login', 'Privacy Policy', 'Terms of Use', 'Support'].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Mail size={14} /> info@moh.gov.rw</li>
                <li className="flex items-center gap-2"><Phone size={14} /> +250 788 000 000</li>
                <li className="flex items-center gap-2"><MapPin size={14} /> Kigali, Rwanda</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs">© 2025 Ministry of Health Rwanda. All rights reserved.</p>
            <p className="text-xs">Smart Medical Supply Chain System — Final Year Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
