import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SupplierProfile from './pages/SupplierProfile';
import UserPermissions from './pages/UserPermissions';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import Requests from './pages/Requests';
import CreateRequest from './pages/CreateRequest';
import Reports from './pages/Reports';
import EmailTemplate from './pages/EmailTemplate';
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
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/new" element={<CreateRequest />} />
          <Route path="/orders" element={<PurchaseOrders />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierProfile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<UserPermissions />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<Onboarding />} />
        <Route path="/onboarding/success" element={<OnboardingSuccess />} />
        <Route path="/email-template" element={<EmailTemplate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
