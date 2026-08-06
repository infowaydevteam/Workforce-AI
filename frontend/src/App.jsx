import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './components/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import Users from './components/pages/admin/Users';
import Organizations from './components/pages/admin/Organizations';
import Teams from './components/pages/admin/Teams';
import Reports from './components/pages/admin/Reports';
import EmployeeDetail from './components/pages/admin/EmployeeDetail';
import AdminPolicies from './components/pages/admin/AdminPolicies';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        {/* Admin */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/employee" element={<Users />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/employee/:id" element={<EmployeeDetail />} />
          <Route path="/admin/organizations" element={<Organizations />} />
          <Route path="/admin/teams" element={<Teams />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/policies" element={<AdminPolicies />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;
