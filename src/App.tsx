import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SupplierProfile from './pages/SupplierProfile';
import UserPermissions from './pages/UserPermissions';
import PurchaseOrders from './pages/PurchaseOrders';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import OnboardingSuccess from './pages/OnboardingSuccess';
// import Requests from './pages/Requests';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/requests" element={<div className="p-4">Requests Placeholder</div>} />
          <Route path="/orders" element={<PurchaseOrders />} />
          <Route path="/suppliers" element={<div className="p-4">Suppliers Placeholder</div>} />
          <Route path="/suppliers/:id" element={<SupplierProfile />} />
          <Route path="/reports" element={<div className="p-4">Reports Placeholder</div>} />
          <Route path="/settings" element={<UserPermissions />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<Onboarding />} />
        <Route path="/onboarding/success" element={<OnboardingSuccess />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
