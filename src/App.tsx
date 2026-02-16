import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppInitializer } from './AppInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
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
import GoogleCallback from './pages/GoogleCallback';
import Contracts from './pages/Contracts';
import Catalog from './pages/Catalog';
import DepartmentBudgets from './pages/DepartmentBudgets';


function App() {
  return (
    <Router>
      <AppInitializer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/success" element={<OnboardingSuccess />} />
        <Route path="/email-template" element={<EmailTemplate />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/:id" element={<Requests />} />
          <Route path="/requests/new" element={<CreateRequest />} />
          <Route path="/orders" element={<PurchaseOrders />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierProfile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/budgets" element={<AdminRoute><DepartmentBudgets /></AdminRoute>} />
          <Route path="/contracts" element={<AdminRoute><Contracts /></AdminRoute>} />
          <Route path="/catalog" element={<AdminRoute><Catalog /></AdminRoute>} />
          <Route path="/settings" element={<UserPermissions />} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
