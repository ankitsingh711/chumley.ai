import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppInitializer } from './AppInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Layout } from './components/layout/Layout';
import { SkeletonLoader } from './components/skeletons/SkeletonLoader';
import { UserRole } from './types/api';

// Lazy load all page components for optimal code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SupplierProfile = lazy(() => import('./pages/SupplierProfile'));
const UserPermissions = lazy(() => import('./pages/UserPermissions'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Requests = lazy(() => import('./pages/Requests'));
const CreateRequest = lazy(() => import('./pages/CreateRequest'));
const Reports = lazy(() => import('./pages/Reports'));
const EmailTemplate = lazy(() => import('./pages/EmailTemplate'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OnboardingSuccess = lazy(() => import('./pages/OnboardingSuccess'));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Catalog = lazy(() => import('./pages/Catalog'));
const DepartmentBudgets = lazy(() => import('./pages/DepartmentBudgets'));


function App() {
  return (
    <Router>
      <AppInitializer />
      <Suspense fallback={<SkeletonLoader />}>
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
            <Route path="/" element={
              <RoleProtectedRoute allowedRoles={[UserRole.SYSTEM_ADMIN, UserRole.SENIOR_MANAGER, UserRole.MANAGER]}>
                <Dashboard />
              </RoleProtectedRoute>
            } />
            <Route path="/requests" element={<Requests />} />
            <Route path="/requests/:id" element={<Requests />} />
            <Route path="/requests/new" element={<CreateRequest />} />
            <Route path="/orders" element={
              <RoleProtectedRoute allowedRoles={[UserRole.SYSTEM_ADMIN, UserRole.SENIOR_MANAGER, UserRole.MANAGER]}>
                <PurchaseOrders />
              </RoleProtectedRoute>
            } />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/suppliers/:id" element={<SupplierProfile />} />
            <Route path="/reports" element={
              <RoleProtectedRoute allowedRoles={[UserRole.SYSTEM_ADMIN, UserRole.SENIOR_MANAGER, UserRole.MANAGER]}>
                <Reports />
              </RoleProtectedRoute>
            } />
            <Route path="/budgets" element={<AdminRoute><DepartmentBudgets /></AdminRoute>} />
            <Route path="/contracts" element={<AdminRoute><Contracts /></AdminRoute>} />
            <Route path="/catalog" element={<AdminRoute><Catalog /></AdminRoute>} />
            <Route path="/settings" element={<UserPermissions />} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
