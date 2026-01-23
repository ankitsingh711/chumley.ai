import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
// Import pages as they are created
// import Dashboard from './pages/Dashboard';
// import Requests from './pages/Requests';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div className="p-4">Dashboard Placeholder</div>} />
          <Route path="/requests" element={<div className="p-4">Requests Placeholder</div>} />
          <Route path="/orders" element={<div className="p-4">Orders Placeholder</div>} />
          <Route path="/suppliers" element={<div className="p-4">Suppliers Placeholder</div>} />
          <Route path="/reports" element={<div className="p-4">Reports Placeholder</div>} />
          <Route path="/settings" element={<div className="p-4">Settings Placeholder</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
