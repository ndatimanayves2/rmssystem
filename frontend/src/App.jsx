import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/shared/Layout';

// Public
import LandingPage  from './pages/public/LandingPage';
import Login        from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Shared pages
import Dashboard    from './pages/Dashboard';
import Inventory    from './pages/Inventory';
import Requests     from './pages/Requests';
import PurchaseOrders from './pages/PurchaseOrders';
import Deliveries   from './pages/Deliveries';
import Reports      from './pages/Reports';
import Forecast     from './pages/Forecast';
import Recommendations from './pages/Recommendations';
import AIChat       from './pages/AIChat';
import Users        from './pages/Users';
import GISMap       from './pages/GISMap';
import QRScanner    from './pages/QRScanner';
import Profile      from './pages/Profile';
import Suppliers    from './pages/Suppliers';
import Warehouses   from './pages/Warehouses';
import Facilities   from './pages/Facilities';
import Receiving    from './pages/Receiving';
import Dispatch     from './pages/Dispatch';
import Invoices     from './pages/Invoices';
import Notifications from './pages/Notifications';
import Settings     from './pages/Settings';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/"      element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected */}
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/dashboard"       element={<Dashboard />} />
              <Route path="/inventory"       element={<Inventory />} />
              <Route path="/medicines"       element={<Inventory />} />
              <Route path="/requests"        element={<Requests />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/deliveries"      element={<Deliveries />} />
<Route path="/reports"         element={<Reports />} />
              <Route path="/forecast"        element={<Forecast />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/ai-assistant"    element={<AIChat />} />
              <Route path="/users"           element={<Users />} />
              <Route path="/gis-map"         element={<GISMap />} />
              <Route path="/scan-qr"         element={<QRScanner />} />
              <Route path="/suppliers"       element={<Suppliers />} />
              <Route path="/warehouses"      element={<Warehouses />} />
              <Route path="/facilities"      element={<Facilities />} />
              <Route path="/receiving"       element={<Receiving />} />
              <Route path="/dispatch"        element={<Dispatch />} />
              <Route path="/invoices"        element={<Invoices />} />
              <Route path="/notifications"   element={<Notifications />} />
              <Route path="/profile"         element={<Profile />} />
              <Route path="/settings"        element={<Settings />} />
              <Route path="/"                element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
