import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import DepartmentBudgets from './pages/DepartmentBudgets';
import ApprovalWorkflow from './pages/ApprovalWorkflow';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
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
              <Route path="/budgets" element={<DepartmentBudgets />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/settings" element={<UserPermissions />} />
              <Route path="/settings/approval-workflows" element={<ApprovalWorkflow />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
